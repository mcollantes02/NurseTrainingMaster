# EIR Mock Exam Manager

## Overview

This is a medical education application built for managing EIR (Enfermero Interno Residente) mock exams and questions. The system allows users to create, organize, and track their progress on medical exam questions across different subjects and topics. Built as a full-stack web application with React frontend and Express backend, it provides comprehensive question management, learning progress tracking, and statistical analysis for medical exam preparation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **Routing**: Wouter for client-side routing with protected routes
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom medical education theme
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for type safety across the stack
- **Authentication**: Firebase Authentication with JWT token verification
- **API Design**: RESTful API with consistent error handling and response formatting
- **Caching**: In-memory caching system for improved performance
- **Data Validation**: Zod schemas for request/response validation

### Database & Storage
- **Primary Database**: Firebase Firestore (NoSQL document database)
- **Data Modeling**: Document-based storage with collections for mock exams, subjects, topics, questions, and relationships
- **Caching Strategy**: Multi-level caching with TTL-based invalidation
- **Schema Management**: TypeScript interfaces defining Firestore document structures

### Authentication & Security
- **Authentication Provider**: Firebase Authentication
- **Supported Methods**: Email/password and Google OAuth sign-in
- **Token Management**: JWT tokens with automatic refresh handling
- **Authorization**: Firebase UID-based access control with middleware protection
- **Security Features**: Token verification, CORS configuration, and request validation

### Deployment & Infrastructure
- **Development**: Local development with Vite dev server and Express
- **Production**: Vercel deployment with serverless functions
- **Environment Configuration**: Environment variables for Firebase and deployment settings
- **Build Process**: Vite build for frontend assets and TypeScript compilation for backend

### Key Features & Design Decisions
- **Internationalization**: Built-in support for Spanish and English languages
- **Responsive Design**: Mobile-first approach with adaptive UI components
- **Real-time Updates**: Optimistic updates with query invalidation for immediate feedback
- **Progressive Enhancement**: Graceful degradation for various connection speeds
- **Error Handling**: Comprehensive error boundaries and user-friendly error messages

### Data Flow Architecture
- **Client-Server Communication**: HTTP requests with automatic retry logic
- **State Synchronization**: Optimistic updates with rollback on failure
- **Cache Management**: Intelligent cache invalidation based on data relationships
- **Performance Optimization**: Lazy loading, pagination, and selective data fetching

## External Dependencies

### Firebase Services
- **Firebase Authentication**: User authentication and authorization
- **Firebase Firestore**: Primary database for application data
- **Firebase Admin SDK**: Server-side Firebase operations and token verification

### UI & Styling Libraries
- **Shadcn/ui**: Pre-built accessible UI components
- **Radix UI**: Headless UI primitives for complex components
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Lucide React**: Icon library for consistent iconography

### Development Tools
- **TypeScript**: Static typing for enhanced development experience
- **Vite**: Build tool and development server
- **TanStack Query**: Data fetching and caching solution
- **React Hook Form**: Form state management and validation
- **Zod**: Runtime type validation and schema definition

### Deployment Platform
- **Vercel**: Hosting platform for serverless deployment
- **Replit**: Development environment integration for live coding

### Additional Libraries
- **Wouter**: Lightweight client-side routing
- **Class Variance Authority**: Component variant management
- **date-fns**: Date manipulation utilities
- **Recharts**: Data visualization for statistics dashboard