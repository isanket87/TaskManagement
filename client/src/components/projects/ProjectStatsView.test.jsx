import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProjectStatsView from './ProjectStatsView';
import { projectService } from '../../services/projectService';
import { taskService } from '../../services/taskService';

// Mock recharts because it fails in jsdom
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }) => <div style={{width: 500, height: 500}}>{children}</div>,
    AreaChart: ({ children }) => <div>{children}</div>,
    Area: () => <div>Area</div>,
    XAxis: () => <div>XAxis</div>,
    YAxis: () => <div>YAxis</div>,
    CartesianGrid: () => <div>CartesianGrid</div>,
    Tooltip: () => <div>Tooltip</div>
}));

// Mock services
vi.mock('../../services/projectService', () => ({
    projectService: {
        getAnalytics: vi.fn(),
        getMembers: vi.fn(),
    },
}));

vi.mock('../../services/taskService', () => ({
    taskService: {
        getAll: vi.fn(),
    },
}));

const mockAnalytics = {
    total: 10,
    completed: 6,
    overdue: 2,
    completionRate: 60,
    byStatus: { todo: 2, in_progress: 2, done: 6 },
    dailyCompletion: { '2026-03-20': 1, '2026-03-21': 2 }
};

const mockMembers = [
    { _id: '1', userName: 'Test User', role: 'Owner' }
];

const mockTasks = [
    { _id: 't1', title: 'Critical Task', priority: 'urgent', status: 'in_progress' }
];

describe('ProjectStatsView', () => {
    let queryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                    staleTime: 0,
                },
            },
        });
        vi.clearAllMocks();
        
        // Default successful mocks
        projectService.getAnalytics.mockResolvedValue({
            data: { success: true, data: { analytics: mockAnalytics } }
        });
        projectService.getMembers.mockResolvedValue({
            data: { success: true, data: { members: mockMembers } }
        });
        taskService.getAll.mockResolvedValue({
            data: { success: true, data: { tasks: mockTasks } }
        });
    });

    it('renders loading state initially', () => {
        // Mock a pending promise
        projectService.getAnalytics.mockReturnValue(new Promise(() => {}));
        
        render(
            <QueryClientProvider client={queryClient}>
                <ProjectStatsView projectId="1" />
            </QueryClientProvider>
        );
        
        // Should show the atmospheric sync message
        expect(screen.getByText(/Syncing Atmosphere/i)).toBeInTheDocument();
    });

    it('renders analytics data with new premium terminology', async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <ProjectStatsView projectId="1" />
            </QueryClientProvider>
        );

        // Header Check
        const header = await screen.findByText('PROJECT OVERVIEW');
        expect(header).toBeInTheDocument();

        // New terms check
        expect(screen.getByText('Operational Volume')).toBeInTheDocument();
        expect(screen.getByText('Efficiency Index')).toBeInTheDocument();
        
        // Value checks
        expect(await screen.findByText('10')).toBeInTheDocument();
        const completionRates = await screen.findAllByText('60%');
        expect(completionRates.length).toBeGreaterThanOrEqual(1);

        // Content check
        expect(screen.getByText('Critical Task')).toBeInTheDocument();
        expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('displays ghost data when no priorities are found', async () => {
        taskService.getAll.mockResolvedValue({
            data: { success: true, data: { tasks: [] } }
        });

        render(
            <QueryClientProvider client={queryClient}>
                <ProjectStatsView projectId="1" />
            </QueryClientProvider>
        );

        // Ghost header check
        expect(await screen.findByText(/Sample Insights active/i)).toBeInTheDocument();
        
        // Ghost content check
        expect(screen.getByText('Refine Project Strategic Roadmap')).toBeInTheDocument();
    });
});
