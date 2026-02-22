import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, FolderKanban, MoreVertical, Trash2, Edit, CheckCircle } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import Dropdown from '../components/ui/Dropdown';
import { ProjectCardSkeleton } from '../components/ui/Skeleton';
import { projectService } from '../services/projectService';
import { PROJECT_COLORS } from '../utils/constants';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

import ProjectCard from '../components/projects/ProjectCard';

const Projects = () => {
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', color: '#6366f1' });
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { slug } = useParams();

    const { data, isLoading } = useQuery({
        queryKey: ['projects', slug],
        queryFn: () => projectService.getAll(),
    });

    const createMutation = useMutation({
        mutationFn: (data) => projectService.create(data),
        onSuccess: (res) => {
            queryClient.invalidateQueries(['projects']);
            toast.success('Project created!');
            setShowCreate(false);
            navigate(`/workspace/${slug}/projects/${res.data.data.project.id}`);
        },
        onError: () => toast.error('Failed to create project'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => projectService.delete(id),
        onSuccess: () => { queryClient.invalidateQueries(['projects']); toast.success('Project deleted'); },
        onError: () => toast.error('Failed to delete project'),
    });

    const projects = data?.data?.data?.projects || [];

    return (
        <PageWrapper title="Projects">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full flex flex-col">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            All Projects
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-0.5 px-2.5 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-700">
                                {projects.length}
                            </span>
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your team's initiatives and folders</p>
                    </div>
                    <Button onClick={() => setShowCreate(true)} className="w-full sm:w-auto shadow-sm">
                        <Plus className="w-4 h-4 mr-1.5" />
                        New Project
                    </Button>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => <ProjectCardSkeleton key={i} />)}
                    </div>
                ) : projects.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                        <EmptyState
                            icon={FolderKanban}
                            title="No projects yet"
                            description="Create your first project to organize tasks, track time, and collaborate with your team."
                            action={<Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1.5" />New Project</Button>}
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {projects.map((p) => (
                            <ProjectCard key={p.id} project={p} onDelete={(id) => deleteMutation.mutate(id)} />
                        ))}
                    </div>
                )}
            </div>

            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Project">
                <div className="space-y-4">
                    <Input label="Project Name" placeholder="My Awesome Project" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                    <div>
                        <label className="label">Description (optional)</label>
                        <textarea className="input resize-none" rows={3} placeholder="What is this project about?" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                    </div>
                    <div>
                        <label className="label">Color</label>
                        <div className="flex gap-2 flex-wrap">
                            {PROJECT_COLORS.map((c) => (
                                <button key={c} onClick={() => setForm((f) => ({ ...f, color: c }))}
                                    className={`w-8 h-8 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-2 ring-primary-500' : 'hover:scale-110'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                        <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
                        <Button isLoading={createMutation.isPending} onClick={() => createMutation.mutate(form)} disabled={!form.name}>Create Project</Button>
                    </div>
                </div>
            </Modal>
        </PageWrapper>
    );
};

export default Projects;
