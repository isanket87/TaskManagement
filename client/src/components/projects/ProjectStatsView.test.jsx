import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProjectStatsView from './ProjectStatsView';
import { projectService } from '../../services/projectService';

// Mock projectService
vi.mock('../../services/projectService', () => ({
    projectService: {
        getAnalytics: vi.fn(),
    },
}));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

const mockAnalytics = {
    total: 10,
    completed: 6,
    overdue: 2,
    completionRate: 60,
    byStatus: { todo: 2, in_progress: 2, done: 6 },
    dailyCompletion: { '2026-03-20': 1, '2026-03-21': 2 }
};

describe('ProjectStatsView', () => {
    let queryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                    staleTime: 0,
                    cacheTime: 0,
                },
            },
        });
        vi.clearAllMocks();
    });

    it('renders loading state initially', () => {
        projectService.getAnalytics.mockReturnValue(new Promise(() => {})); // Never resolves
        render(
            <QueryClientProvider client={queryClient}>
                <ProjectStatsView projectId="1" />
            </QueryClientProvider>
        );
        // Expect pulse loaders (skeletons)
        const pulse = document.querySelector('.animate-pulse');
        expect(pulse).toBeDefined();
    });

    it('renders analytics data correctly', async () => {
        projectService.getAnalytics.mockResolvedValue({
            data: { success: true, data: { analytics: mockAnalytics } }
        });

        render(
            <QueryClientProvider client={queryClient}>
                <ProjectStatsView projectId="1" />
            </QueryClientProvider>
        );

        // Wait for the total count to appear - this confirms loading is done
        const totalCounts = await screen.findAllByText('10', {}, { timeout: 3000 });
        expect(totalCounts[0]).toBeInTheDocument();
        
        expect(screen.getByText('Total Tasks')).toBeInTheDocument();
        const completionRates = screen.getAllByText('60%');
        expect(completionRates[0]).toBeInTheDocument();
        expect(screen.getByText('Completion Rate')).toBeInTheDocument();

        // Check Status breakdown labels
        expect(screen.getByText(/todo/i)).toBeInTheDocument();
        expect(screen.getByText(/in progress/i)).toBeInTheDocument();
        expect(screen.getByText(/done/i)).toBeInTheDocument();
    });
});
