# Contributing to LMM Finance ERP

Thank you for considering contributing to LMM Finance ERP! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) to ensure a welcoming environment for all contributors.

## How to Contribute

### Reporting Issues

1. Check if the issue already exists
2. Use the issue templates provided
3. Provide detailed information:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Environment details

### Suggesting Features

1. Open a feature request issue
2. Describe the feature and its benefits
3. Provide use cases and examples
4. Consider implementation complexity

### Contributing Code

1. Fork the repository
2. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git
- Cloudflare account (for deployment)

### Setup Steps

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/your-username/lmm-finance-erp.git
   cd lmm-finance-erp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

## Development Guidelines

### Code Style

- Use ESLint configuration provided
- Follow Prettier formatting
- Use TypeScript for type safety
- Follow React best practices

### Git Commit Messages

Use conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

### Branch Naming

- `feature/feature-name`: New features
- `fix/bug-description`: Bug fixes
- `docs/doc-update`: Documentation
- `refactor/component-name`: Refactoring

### Testing

- Write unit tests for new features
- Ensure all tests pass before submitting
- Maintain test coverage above 80%

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Documentation

- Update README.md for new features
- Add JSDoc comments for functions
- Update API documentation
- Include usage examples

## Pull Request Process

1. Ensure your code follows the style guidelines
2. Update documentation if necessary
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit pull request with clear description

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Manual testing completed
- [ ] No regressions introduced

## Screenshots
(if applicable)

## Related Issues
Closes #123
```

## Review Process

1. All submissions require review
2. Reviewers will check:
   - Code quality
   - Test coverage
   - Documentation
   - Security implications
3. Address feedback promptly
4. Maintain clean commit history

## Release Process

1. Version bumping follows semantic versioning
2. Create release notes
3. Tag releases
4. Update documentation
5. Deploy to production

## Community

- Join our Discord server for discussions
- Participate in community calls
- Help other contributors
- Share your experience

## Questions?

- Check existing documentation
- Search through issues
- Ask in Discord community
- Email: contributors@lmm-finance.com

## Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- Special mentions in community updates

Thank you for contributing to LMM Finance ERP! 🎉