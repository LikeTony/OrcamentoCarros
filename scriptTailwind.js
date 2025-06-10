tailwind.config = {
  theme: {
    extend: {
      colors: {
        // Tema escuro
        dark: {
          background: '#121212',
          surface: '#1E1E1E',
          surfaceHover: '#2A2A2A',
          primary: '#4F46E5',
          secondary: '#7C3AED',
          accent: '#06B6D4',
          textPrimary: '#FFFFFF',
          textSecondary: '#B3B3B3'
        },
        // Tema claro
        light: {
          background: '#F8FAFC',
          surface: '#FFFFFF',
          surfaceHover: '#F1F5F9',
          primary: '#4F46E5',
          secondary: '#7C3AED',
          accent: '#06B6D4',
          textPrimary: '#1E293B',
          textSecondary: '#64748B'
        }
      }
    }
  }
}
