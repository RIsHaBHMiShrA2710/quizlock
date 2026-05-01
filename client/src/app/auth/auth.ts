import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.html',
  styleUrl: './auth.scss'
})
export class Auth {
  isLogin = true;
  email = '';
  password = '';
  errorMessage = '';

  private apiUrl = 'http://localhost:8000/auth';

  constructor(private http: HttpClient, private router: Router) { }

  toggleMode() {
    this.isLogin = !this.isLogin;
    this.errorMessage = '';
  }

  onSubmit() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Please fill out all fields.';
      return;
    }

    const endpoint = this.isLogin ? '/login' : '/register';
    const payload = { email: this.email, password: this.password };

    this.http.post<any>(`${this.apiUrl}${endpoint}`, payload).subscribe({
      next: (response) => {
        // If login, save token
        if (this.isLogin && response.access_token) {
          localStorage.setItem('auth_token', response.access_token);
        }
        // Redirect to options page
        this.router.navigate(['/options']);
      },
      error: (err) => {
        this.errorMessage = err.error?.detail || 'An error occurred. Please try again.';
      }
    });
  }
}
