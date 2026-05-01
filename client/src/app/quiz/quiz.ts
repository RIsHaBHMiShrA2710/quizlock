import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

declare var renderMathInElement: any;

interface UserInfo {
  field: string;
  className: string;
  exam: string;
  groqApiKey: string;
  questionType: 'mcq' | 'open_ended';
}

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quiz.html',
  styleUrl: './quiz.scss'
})
export class Quiz implements OnInit {
  private readonly API = 'http://localhost:8000/quiz';

  targetSite = '';
  userInfo: UserInfo | null = null;
  loading = true;
  loadingMessage = 'Preparing your quiz...';
  errorMessage = '';

  questionData: any = null;
  questionNumber = 0;
  totalCorrect = 0;
  totalQuestions = 3;

  selectedOption = '';
  subjectiveAnswer = '';

  questionResult = '';
  feedbackDetails = ''; // Separate storage for AI feedback text
  showNextButton = false;

  resultMessage = '';
  passed = false;
  failed = false;
  quizComplete = false;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    console.log('[QuizLock] Quiz component initialized');

    // Override body dimensions for full-page quiz mode
    document.documentElement.style.width = '100%';
    document.documentElement.style.height = '100%';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.body.style.background = 'transparent';

    this.route.queryParams.subscribe(params => {
      this.targetSite = params['target'] || 'Unknown Site';
      console.log('[QuizLock] Target site:', this.targetSite);
      this.checkCooldownAndGenerate();
    });
  }

  /**
   * Trigger KaTeX math rendering after Angular has flushed DOM updates.
   */
  private renderMath() {
    setTimeout(() => {
      if (typeof renderMathInElement === 'undefined') {
        console.warn('[QuizLock] KaTeX auto-render not loaded yet');
        return;
      }
      try {
        renderMathInElement(document.body, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
          ],
          throwOnError: false
        });
        console.log('[QuizLock] KaTeX rendering complete');
      } catch (e) {
        console.warn('[QuizLock] KaTeX render error:', e);
      }
    }, 200);
  }

  checkCooldownAndGenerate() {
    console.log('[QuizLock] Checking cooldown and loading user info...');

    chrome.storage.local.get(['userInfo', 'quizCooldowns'], (result: any) => {
      console.log('[QuizLock] Storage result:', JSON.stringify(result, null, 2));

      if (result.quizCooldowns && result.quizCooldowns[this.targetSite]) {
        const cooldownData = result.quizCooldowns[this.targetSite];
        const remaining = cooldownData.expiresAt - Date.now();
        if (remaining > 0) {
          this.loading = false;
          this.errorMessage = `Quiz locked. Try again in ~${Math.ceil(remaining / 60000)} minute(s).`;
          this.cdr.detectChanges();
          return;
        }
      }

      if (!result.userInfo) {
        this.loading = false;
        this.errorMessage = 'Please configure your profile in the extension Options first.';
        this.cdr.detectChanges();
        return;
      }

      this.userInfo = result.userInfo;
      this.questionNumber = 0;
      this.totalCorrect = 0;
      this.cdr.detectChanges();
      this.generateQuestion();
    });
  }

  generateQuestion() {
    this.questionNumber++;
    this.loading = true;
    this.loadingMessage = `Generating question ${this.questionNumber} of ${this.totalQuestions}...`;
    this.questionData = null;
    this.selectedOption = '';
    this.subjectiveAnswer = '';
    this.questionResult = '';
    this.showNextButton = false;
    this.cdr.detectChanges();

    console.log(`[QuizLock] Requesting question ${this.questionNumber}/${this.totalQuestions}`);

    const payload = {
      field: this.userInfo!.field,
      class_name: this.userInfo!.className,
      exam: this.userInfo!.exam,
      question_type: this.userInfo!.questionType
    };

    this.http.post<any>(`${this.API}/generate`, payload).subscribe({
      next: (data) => {
        console.log('[QuizLock] Backend response:', JSON.stringify(data));
        this.questionData = data;
        this.loading = false;
        this.cdr.detectChanges();
        this.renderMath();
      },
      error: (err) => {
        console.error('[QuizLock] /generate error:', err);
        this.loading = false;
        this.errorMessage = `Backend error: ${err.error?.detail || err.message || 'Unknown'}`;
        this.cdr.detectChanges();
      }
    });
  }

  submitAnswer() {
    console.log('[QuizLock] Answer submitted');

    if (this.userInfo?.questionType === 'mcq') {
      const correct = this.questionData.correctAnswer?.trim();
      const selected = this.selectedOption?.trim();
      console.log('[QuizLock] Selected:', selected, '| Correct:', correct);

      const isCorrect = selected === correct ||
        correct?.startsWith(selected?.substring(0, 2)) ||
        selected?.startsWith(correct?.substring(0, 2));

      if (isCorrect) {
        this.totalCorrect++;
        this.questionResult = '✅ Correct!';
      } else {
        this.questionResult = `❌ Wrong. Answer: ${correct}`;
      }
      this.showNextButton = true;
      this.cdr.detectChanges();
      this.renderMath();
    } else {
      this.loading = true;
      this.loadingMessage = 'AI is evaluating your answer...';
      this.cdr.detectChanges();
      this.evaluateSubjective();
    }
  }

  nextQuestion() {
    if (this.questionNumber >= this.totalQuestions) {
      this.finishQuiz();
    } else {
      this.generateQuestion();
    }
  }

  evaluateSubjective() {
    console.log('[QuizLock] POST /quiz/evaluate');

    const payload = {
      question: this.questionData.question,
      expected_concepts: this.questionData.expectedConcepts || '',
      student_answer: this.subjectiveAnswer
    };

    this.http.post<any>(`${this.API}/evaluate`, payload).subscribe({
      next: (data) => {
        console.log('[QuizLock] Evaluation result:', data);
        if (data.passed) {
          this.totalCorrect++;
          this.questionResult = '✅';
          this.feedbackDetails = data.feedback;
        } else {
          this.questionResult = '❌';
          this.feedbackDetails = data.feedback;
        }
        this.loading = false;
        this.showNextButton = true;
        this.cdr.detectChanges();
        this.renderMath();
      },
      error: (err) => {
        console.error('[QuizLock] Evaluation error:', err);
        this.loading = false;
        this.errorMessage = `Evaluation error: ${err.error?.detail || err.message}`;
        this.cdr.detectChanges();
      }
    });
  }

  finishQuiz() {
    console.log(`[QuizLock] Quiz finished. Score: ${this.totalCorrect}/${this.totalQuestions}`);
    this.quizComplete = true;
    this.showNextButton = false;

    const passThreshold = Math.ceil(this.totalQuestions / 2);
    const didPass = this.totalCorrect >= passThreshold;

    if (didPass) {
      this.passed = true;
      this.resultMessage = `Score: ${this.totalCorrect}/${this.totalQuestions}. Site unlocked for 10 minutes!`;

      chrome.storage.local.get('unlockedSites', (result: any) => {
        const unlockedSites = result.unlockedSites || {};
        unlockedSites[this.targetSite] = { expiresAt: Date.now() + 10 * 60 * 1000 };
        chrome.storage.local.set({ unlockedSites }, () => {
          console.log('[QuizLock] Site unlocked:', this.targetSite);
        });
      });

      this.cdr.detectChanges();
      setTimeout(() => { window.location.href = `https://${this.targetSite}`; }, 3000);
    } else {
      this.failed = true;
      this.resultMessage = `Score: ${this.totalCorrect}/${this.totalQuestions}. Need ${passThreshold} to pass. Locked for 5 min.`;

      chrome.storage.local.get('quizCooldowns', (result: any) => {
        const quizCooldowns = result.quizCooldowns || {};
        quizCooldowns[this.targetSite] = { expiresAt: Date.now() + 5 * 60 * 1000 };
        chrome.storage.local.set({ quizCooldowns }, () => {
          console.log('[QuizLock] Cooldown set for:', this.targetSite);
        });
      });

      this.cdr.detectChanges();
    }
  }
}
