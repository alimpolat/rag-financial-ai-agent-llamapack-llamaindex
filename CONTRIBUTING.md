# Contributing to RAG Financial AI Agent

We love your input! We want to make contributing to this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

## Pull Requests

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- Ollama with language models

### Installation

```bash
# Clone your fork
git clone https://github.com/yourusername/rag-financial-ai-agent.git
cd rag-financial-ai-agent

# Install dependencies
npm install
npm run py:install

# Setup environment
cp .env.local.example .env.local
# Edit .env.local with your configuration
```

### Running the Application

```bash
# Terminal 1: Start Python backend
npm run py:serve

# Terminal 2: Start Next.js frontend
npm run dev
```

### Running Tests

```bash
# Run frontend tests
npm test

# Run Python tests
npm run py:test

# Run with coverage
npm run test:coverage
```

## Code Style

### TypeScript/JavaScript

- Use TypeScript throughout
- Follow ESLint configuration
- Use Prettier for formatting
- Write meaningful variable and function names
- Add JSDoc comments for complex functions

### Python

- Follow PEP 8 style guide
- Use type hints
- Write docstrings for functions and classes
- Use meaningful variable names
- Keep functions focused and small

### General Guidelines

- Write self-documenting code
- Add comments for complex logic
- Keep functions under 50 lines when possible
- Use consistent naming conventions
- Write tests for new features

## Commit Messages

Use conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: new feature
- `fix`: bug fix
- `docs`: documentation changes
- `style`: formatting changes
- `refactor`: code refactoring
- `test`: adding tests
- `chore`: maintenance tasks

Examples:
```
feat(chat): add streaming response support
fix(upload): handle large file validation
docs(api): update endpoint documentation
```

## Testing

- Write unit tests for new features
- Add integration tests for API endpoints
- Test edge cases and error conditions
- Maintain good test coverage (>70%)

## Documentation

- Update README.md for new features
- Update API documentation in docs/
- Add inline code comments
- Update CHANGELOG.md

## Issue Reporting

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Feature Requests

We track feature requests as GitHub issues. When creating a feature request:

- Use a clear and descriptive title
- Provide a detailed description of the proposed feature
- Explain why this feature would be useful
- Consider including mockups or examples

## Security

If you find a security vulnerability, please email us directly instead of opening an issue. We take security seriously and will respond promptly.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Don't hesitate to reach out if you have questions about contributing. We're here to help!

## Recognition

Contributors will be recognized in our README.md and release notes. We appreciate all contributions, no matter how small!

---

Thank you for contributing to RAG Financial AI Agent! 🚀
