import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { completeProfileOnboardingGuard } from '../../core/guards/member-profile-onboarding.guard';
import { OnboardingCompleteProfileComponent } from './onboarding-complete-profile.component';

export const onboardingCompleteProfileRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard, completeProfileOnboardingGuard],
    component: OnboardingCompleteProfileComponent,
  },
];
