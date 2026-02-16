export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
  requirements: {
    minLength: boolean;
    hasUpperCase: boolean;
    hasLowerCase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

export const validatePassword = (password: string): PasswordValidation => {
  const errors: string[] = [];
  let strength: 'weak' | 'medium' | 'strong' = 'weak';

  // Gereksinim kontrolleri
  const minLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  // Hata mesajları
  if (!minLength) {
    errors.push('En az 8 karakter olmalı');
  }

  if (!hasUpperCase) {
    errors.push('En az 1 büyük harf içermeli');
  }

  if (!hasLowerCase) {
    errors.push('En az 1 küçük harf içermeli');
  }

  if (!hasNumber) {
    errors.push('En az 1 rakam içermeli');
  }

  if (!hasSpecialChar) {
    errors.push('En az 1 özel karakter içermeli (!@#$%^&* vb.)');
  }

  // Güç hesaplama
  const criteriaCount = [minLength, hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar].filter(Boolean).length;

  if (criteriaCount >= 5) {
    strength = 'strong';
  } else if (criteriaCount >= 3) {
    strength = 'medium';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    requirements: {
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      hasSpecialChar,
    },
  };
};

export const getPasswordStrengthColor = (strength: 'weak' | 'medium' | 'strong'): string => {
  switch (strength) {
    case 'weak':
      return 'bg-red-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'strong':
      return 'bg-green-500';
  }
};

export const getPasswordStrengthText = (strength: 'weak' | 'medium' | 'strong'): string => {
  switch (strength) {
    case 'weak':
      return 'Zayıf';
    case 'medium':
      return 'Orta';
    case 'strong':
      return 'Güçlü';
  }
};
