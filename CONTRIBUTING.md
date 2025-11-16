# Contributing to AI Audit Aid (AAA)

Thank you for your interest in contributing to AI Audit Aid! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/ai-audit-aid.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test thoroughly
6. Commit with clear messages
7. Push to your fork
8. Open a Pull Request

## Development Setup

```bash
npm install
cp .env.example .env.local
# Add your GEMINI_API_KEY to .env.local
npm run dev
```

## Code Style

- Use TypeScript for type safety
- Follow existing code formatting
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and small

## Testing Changes

- Test with various document formats (PDF, DOCX, TXT)
- Verify multi-framework functionality
- Check batch processing modes
- Test audit history and comparison features
- Ensure no console errors

## Pull Request Guidelines

- Provide a clear description of changes
- Reference any related issues
- Include screenshots for UI changes
- Ensure no breaking changes without discussion
- Update documentation if needed

## Areas for Contribution

- Bug fixes
- Performance improvements
- UI/UX enhancements
- Additional regulatory framework support
- Documentation improvements
- Test coverage
- Accessibility improvements

## Questions?

Open an issue for discussion before major changes.

Thank you for helping improve AI Audit Aid!
