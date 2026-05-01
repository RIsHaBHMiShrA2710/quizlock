import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: 'auth', loadComponent: () => import('./auth/auth').then(m => m.Auth) },
    { path: 'options', loadComponent: () => import('./options/options').then(m => m.Options) },
    { path: 'quiz', loadComponent: () => import('./quiz/quiz').then(m => m.Quiz) },
    { path: '', redirectTo: 'options', pathMatch: 'full' }
];
