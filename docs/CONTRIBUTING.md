# Contributing Guidelines

## Code Style

### TypeScript/JavaScript

- Use TypeScript strict mode
- Follow ESLint configuration
- Use Prettier for formatting
- Use camelCase for variables/functions
- Use PascalCase for classes/components
- Use UPPER_SNAKE_CASE for constants

### Comments

```typescript
// Use single-line comments for brief explanations

/**
 * Use JSDoc for functions and classes
 * @param user - The user object
 * @returns The formatted user name
 */
function formatUserName(user: User): string {
  // Implementation
}
```

### File Organization

**Frontend Components:**
```
components/
├── ui/                    # Base UI components
├── auth/                  # Auth-related components
├── application/           # Application-related components
│   ├── ApplicationForm.tsx
│   ├── ApplicationCard.tsx
│   └── index.ts          # Barrel export
└── index.ts              # Root export
```

**Backend Modules:**
```
src/
├── auth/                  # Authentication module
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   └── dtos/             # Data Transfer Objects
├── applications/         # Application module
│   ├── applications.service.ts
│   ├── applications.controller.ts
│   ├── applications.module.ts
│   └── dtos/
└── common/               # Shared utilities
    ├── decorators/
    ├── guards/
    └── filters/
```

## Commit Messages

Follow Conventional Commits format:

```
type(scope): subject

body

footer
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style changes
- `refactor` - Code refactoring
- `perf` - Performance improvement
- `test` - Test changes
- `chore` - Build/dependency changes

**Examples:**
```
feat(auth): add student login endpoint
fix(applications): correct fee calculation for repeat exams
docs(api): update endpoint documentation
```

## Pull Request Process

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run linting: `npm run lint`
4. Run tests: `npm run test`
5. Format code: `npm run format`
6. Commit with meaningful message
7. Push to branch: `git push origin feature/your-feature`
8. Create Pull Request

## Testing

### Backend Unit Tests

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should authenticate valid credentials', () => {
    const result = service.login('test@example.com', 'password');
    expect(result).toHaveProperty('accessToken');
  });
});
```

### Frontend Component Tests

```typescript
import { render, screen } from '@testing-library/react';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('renders login form', () => {
    render(<LoginForm />);
    expect(screen.getByText('Login')).toBeInTheDocument();
  });
});
```

## Performance Guidelines

### Frontend
- Lazy load components with `React.lazy()`
- Memoize components with `React.memo()` when needed
- Use `useCallback` for event handlers
- Optimize images (use Next.js Image component)
- Minimize bundle size

### Backend
- Index database queries
- Use pagination for large datasets
- Implement caching with Redis
- Use DTOs for validation
- Batch database operations when possible

## Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Validate input** - Use Zod/class-validator
3. **Sanitize output** - Prevent XSS attacks
4. **Use HTTPS** - Always in production
5. **Hash passwords** - Use Argon2
6. **Rate limiting** - Implement on sensitive endpoints
7. **CORS** - Configure appropriately
8. **SQL Injection** - Use parameterized queries (Prisma handles this)

## Documentation

- Document public APIs with JSDoc
- Update README for major changes
- Add migration notes if database schema changes
- Document environment variables
- Include code examples where helpful

## Development Workflow

### Before Starting
```bash
# Update dependencies
npm install

# Create feature branch
git checkout -b feature/my-feature
```

### During Development
```bash
# Format code
npm run format

# Run linting
npm run lint

# Type checking
npm run type-check

# Run tests
npm run test

# Dev server
npm run dev
```

### Before Committing
```bash
# Run full check
npm run lint
npm run type-check
npm run test

# Commit with conventional message
git commit -m "feat(module): description"

# Push branch
git push origin feature/my-feature
```

## Common Patterns

### API Endpoint Implementation

```typescript
// Controller
@Controller('applications')
export class ApplicationsController {
  constructor(private applicationsService: ApplicationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createApplicationDto: CreateApplicationDto) {
    return this.applicationsService.create(createApplicationDto);
  }
}

// Service
@Injectable()
export class ApplicationsService {
  constructor(private prisma: PrismaService) {}

  async create(createApplicationDto: CreateApplicationDto) {
    return this.prisma.application.create({
      data: createApplicationDto,
    });
  }
}
```

### React Component

```typescript
interface ApplicationFormProps {
  onSubmit: (data: ApplicationData) => void;
}

export const ApplicationForm: React.FC<ApplicationFormProps> = ({ onSubmit }) => {
  const { handleSubmit, control } = useForm<ApplicationData>();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
};
```

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Best Practices](https://react.dev/)
- [Prisma ORM](https://www.prisma.io/docs/)
