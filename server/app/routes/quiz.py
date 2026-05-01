from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import re
import json
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

load_dotenv()

router = APIRouter(prefix="/quiz", tags=["quiz"])

# ─── Request Models ───

class GenerateRequest(BaseModel):
    field: str
    class_name: str
    exam: str
    question_type: str  # 'mcq' | 'open_ended'

class EvaluateRequest(BaseModel):
    question: str
    expected_concepts: str
    student_answer: str

# ─── LLM Setup ───

def get_llm():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not set in server .env")
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=api_key,
        temperature=0.8,
        model_kwargs={"response_format": {"type": "json_object"}}
    )

# ─── LaTeX JSON Escaping Fix ───
# When an LLM outputs \frac, \nabla, \theta, etc. in a JSON string,
# the JSON parser interprets \f as form feed, \n as newline, \t as tab,
# \b as backspace, \r as carriage return — destroying the LaTeX.
# This function fixes it BEFORE json.loads() runs.

def fix_latex_in_json(raw: str) -> str:
    """
    Fix LaTeX backslash commands that collide with JSON escape sequences.
    
    Detects patterns like \\f, \\n, \\t, \\b, \\r FOLLOWED by a letter
    (indicating a LaTeX command like \\frac, \\nabla, \\theta, \\beta, \\rho)
    and escapes them properly for JSON parsing.
    """
    # Match a backslash + JSON escape char + more letters (LaTeX command pattern)
    # (?<!\\) ensures we don't double-escape already escaped backslashes
    fixed = re.sub(r'(?<!\\)\\([fntrb])(?=[a-zA-Z])', r'\\\\\\1', raw)
    
    if fixed != raw:
        print(f"[QuizLock API] Fixed LaTeX escaping in JSON response")
    
    return fixed


def safe_parse_llm_json(raw: str) -> dict:
    """Parse LLM JSON output with LaTeX escaping fix."""
    # First try: parse as-is (works when LLM properly double-escapes)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    
    # Second try: fix LaTeX escaping issues
    fixed = fix_latex_in_json(raw)
    try:
        return json.loads(fixed)
    except json.JSONDecodeError as e:
        print(f"[QuizLock API] Even after fix, JSON parse failed: {e}")
        print(f"[QuizLock API] Raw: {repr(raw[:500])}")
        raise


# ─── Generate Question ───

@router.post("/generate")
async def generate_quiz(req: GenerateRequest):
    print(f"[QuizLock API] /generate called — field={req.field}, class={req.class_name}, exam={req.exam}, type={req.question_type}")

    llm = get_llm()

    math_instruction = (
        "CRITICAL JSON ESCAPING RULE: Since the output is JSON, ALL backslashes in LaTeX "
        "commands MUST be double-escaped. Write \\\\frac NOT \\frac, \\\\int NOT \\int, "
        "\\\\theta NOT \\theta, \\\\sqrt NOT \\sqrt, etc. "
        "Use $...$ delimiters for inline math and $$...$$ for display math. "
        "Example: $\\\\frac{1}{2}$, $x^2 + y^2 = r^2$, $\\\\int_0^1 f(x)dx$, $H_2O$. "
        "Do NOT use Unicode superscripts/subscripts."
    )

    if req.question_type == "mcq":
        user_prompt = (
            f"Generate ONE challenging multiple-choice question for a student in class '{req.class_name}' "
            f"preparing for the '{req.exam}' exam in the field of '{req.field}'. "
            f"Prefer previous year questions (PYQs). {math_instruction} "
            f"Return JSON with keys: \"question\" (string), \"options\" (array of 4 strings like \"A) ...\"), "
            f"\"correctAnswer\" (the full string matching one option from the array), "
            f"and \"explanation\" (string explaining the concept and the correct answer)."
        )
    else:
        user_prompt = (
            f"Generate ONE challenging open-ended question for a student in class '{req.class_name}' "
            f"preparing for the '{req.exam}' exam in the field of '{req.field}'. "
            f"{math_instruction} "
            f"Return JSON with keys: \"question\" (string) and \"expectedConcepts\" (string of key points expected)."
        )

    messages = [
        SystemMessage(content=(
            "You are an expert exam question generator. Always respond with valid JSON only. "
            "CRITICAL: In JSON strings, backslashes must be escaped. For LaTeX, write \\\\frac not \\frac, "
            "\\\\int not \\int, \\\\theta not \\theta, \\\\sqrt not \\sqrt, \\\\sum not \\sum. "
            "Use $...$ delimiters around math."
        )),
        HumanMessage(content=user_prompt)
    ]

    try:
        print("[QuizLock API] Invoking LLM for generation...")
        response = llm.invoke(messages)
        raw = response.content
        print(f"[QuizLock API] LLM raw response: {raw}")

        parsed = safe_parse_llm_json(raw)
        print(f"[QuizLock API] Parsed response: {json.dumps(parsed, indent=2)}")
        return parsed

    except json.JSONDecodeError as e:
        print(f"[QuizLock API] JSON parse error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse LLM response: {str(e)}")
    except Exception as e:
        print(f"[QuizLock API] LLM error: {e}")
        raise HTTPException(status_code=500, detail=f"LLM call failed: {str(e)}")

# ─── Evaluate Answer ───

@router.post("/evaluate")
async def evaluate_answer(req: EvaluateRequest):
    print(f"[QuizLock API] /evaluate called — question={req.question[:50]}...")

    llm = get_llm()

    user_prompt = (
        f"Evaluate the student's answer:\n"
        f"Question: {req.question}\n"
        f"Expected Concepts: {req.expected_concepts}\n"
        f"Student Answer: {req.student_answer}\n\n"
        f"Return JSON with: \"passed\" (boolean) and \"feedback\" (short string). "
        f"IMPORTANT: In JSON, escape all LaTeX backslashes as double-backslash (\\\\frac, \\\\int, etc)."
    )

    messages = [
        SystemMessage(content=(
            "You are a fair exam evaluator. Return valid JSON only. "
            "If feedback contains math, use LaTeX with $...$ delimiters and double-escaped backslashes in JSON."
        )),
        HumanMessage(content=user_prompt)
    ]

    try:
        print("[QuizLock API] Invoking LLM for evaluation...")
        response = llm.invoke(messages)
        raw = response.content
        print(f"[QuizLock API] Evaluation raw: {raw}")

        parsed = safe_parse_llm_json(raw)
        print(f"[QuizLock API] Evaluation parsed: {json.dumps(parsed, indent=2)}")
        return parsed

    except json.JSONDecodeError as e:
        print(f"[QuizLock API] Eval JSON parse error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse evaluation: {str(e)}")
    except Exception as e:
        print(f"[QuizLock API] Eval LLM error: {e}")
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")
