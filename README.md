# Payroll Management - Modern Payroll Management System

A lightweight, secure, modern payroll system for small businesses with up to 100 employees.

##  Features

- **Payroll Automation**: Monthly/semi-monthly payroll with gross-to-net calculations
- **Employee Management**: Complete profiles with bank details and tax information
- **Time Import**: CSV upload for overtime and time entries
- **Payslip Generation**: Professional PDF payslips with email delivery
- **Reports & Analytics**: Payroll summaries, tax reports, and employee costs
- **Dark Mode**: Full dark mode support
- **Mobile-First**: Responsive design for all devices

##  Tech Stack

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript
- TailwindCSS
- shadcn/ui
- Recharts
- TanStack Table

### Backend
- Node.js 20+
- Express/NestJS
- Prisma ORM
- PostgreSQL
- JWT Authentication

##  Database Schema

See `docs/prisma-schema.prisma` for the complete database schema including:

- **User**: Authentication and roles
- **Employee**: Employee profiles and compensation
- **PayrollRun**: Payroll batch processing
- **PayrollItem**: Individual employee payroll
- **Payslip**: Generated payslips
- **TimeEntry**: Time tracking
- **Deduction/Benefit**: Templates and enrollments

##  API Documentation

See `docs/openapi-spec.yaml` for the complete API specification.

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/login | User authentication |
| GET | /employees | List employees |
| POST | /employees | Create employee |
| POST | /payroll | Create payroll run |
| POST | /payroll/:id/finalize | Finalize and generate payslips |
| GET | /payslips/:id/pdf | Download payslip PDF |

##  UI/UX Design System

### Colors
- **Primary**: Indigo (#6366f1)
- **Secondary**: Teal (#14b8a6)
- **Background**: White/Dark slate
- **Neutrals**: Slate scale

### Typography
- **Font**: Inter
- **Headings**: 600-700 weight
- **Body**: 400-500 weight

### Spacing
- 8pt grid system
- Consistent padding/margins

##  Security

- JWT-based authentication
- Role-based access control (Admin, Employee)
- Encrypted sensitive data (SSN, bank accounts)
- Audit logging for all actions
- Session timeout configuration
