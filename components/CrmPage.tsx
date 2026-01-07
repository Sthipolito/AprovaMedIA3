
import React, { useState, useEffect, useMemo } from 'react';
import * as academicService from '../services/academicService';
import { Student, Course, Class } from '../types';
import { 
    UsersIcon, SearchIcon, PlusCircleIcon, ShieldAlertIcon, 
    StarIcon, TrendingUpIcon, AlertTriangleIcon, 
    LayoutGridIcon, ClipboardListIcon, CheckCircleIcon 
} from './IconComponents';
import StudentProfile from './StudentProfile';
import EditStudentModal from './EditStudentModal';
import AddStudentModal from './AddStudentModal';

const CrmPage: React.FC = () => {
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'risk' | 'high' | 'new'>('all');

    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        const [studentsData, coursesData, classesData] = await Promise.all([
            academicService.getAllStudentsWithDetails(),
            academicService.getCourses(),
            academicService.getClasses(),
        ]);
        setAllStudents(studentsData);
        setCourses(coursesData);
        setClasses(classesData);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- Smart Badges Logic (Mock for demo, connect to analytics in real app) ---
    const getStudentStatus = (student: Student) => {
        // In a real scenario, calculate based on student.analytics.averageScore etc.
        // Using random logic for visual demonstration if fields are missing
        const score = Math.floor(Math.random() * 100); 
        if (score > 85) return { label: 'High Performer', color: 'bg-green-100 text-green-700', icon: StarIcon, type: 'high' };
        if (score < 50) return { label: 'Risco de Evasão', color: 'bg-red-100 text-red-700', icon: ShieldAlertIcon, type: 'risk' };
        
        const isNew = (new Date().getTime() - new Date(student.created_at).getTime()) < (1000 * 60 * 60 * 24 * 7); // 7 days
        if (isNew) return { label: 'Novo Aluno', color: 'bg-blue-100 text-blue-700', icon: CheckCircleIcon, type: 'new' };

        return { label: 'Regular', color: 'bg-gray-100 text-gray-600', icon: UsersIcon, type: 'regular' };
    };

    // --- Stats ---
    const stats = useMemo(() => {
        const enriched = allStudents.map(s => ({ ...s, status: getStudentStatus(s) }));
        return {
            total: enriched.length,
            risk: enriched.filter(s => s.status.type === 'risk').length,
            high: enriched.filter(s => s.status.type === 'high').length,
            new: enriched.filter(s => s.status.type === 'new').length
        };
    }, [allStudents]);

    // --- Filtering ---
    const filteredStudents = useMemo(() => {
        return allStudents.filter(student => {
            const matchesCourse = !selectedCourseId || student.classes?.courses?.id === selectedCourseId;
            const matchesClass = !selectedClassId || student.classId === selectedClassId;
            const matchesSearch = !searchTerm || student.name.toLowerCase().includes(searchTerm.toLowerCase());
            
            const status = getStudentStatus(student);
            const matchesStatus = statusFilter === 'all' || status.type === statusFilter;

            return matchesCourse && matchesClass && matchesSearch && matchesStatus;
        });
    }, [allStudents, searchTerm, selectedCourseId, selectedClassId, statusFilter]);

    const filteredClasses = useMemo(() => {
        if (!selectedCourseId) return classes;
        return classes.filter(c => c.courseId === selectedCourseId);
    }, [selectedCourseId, classes]);

    // --- Handlers ---
    const handleSaveEdit = async (updates: any) => {
        if (!editingStudent) return;
        await academicService.updateStudent(editingStudent, updates);
        setEditingStudent(null);
        fetchData();
    };

    const handleDeleteStudent = async (studentId: string) => {
        if (window.confirm("Tem certeza?")) {
            await academicService.deleteStudent(studentId);
            setSelectedStudent(null);
            fetchData();
        }
    };

    return (
        <div className="h-full w-full flex flex-col bg-gray-50 overflow-hidden">
            {/* Hero / Insights Section */}
            <div className="bg-white border-b border-gray-200 p-8 flex-shrink-0 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Student Insights</h1>
                        <p className="text-gray-500 mt-1">Monitoramento inteligente de performance e engajamento.</p>
                    </div>
                    <button onClick={() => setIsAddModalOpen(true)} className="px-4 py-2.5 bg-gray-900 text-white font-semibold rounded-lg hover:bg-black transition-colors flex items-center gap-2 shadow-lg shadow-gray-900/20">
                        <PlusCircleIcon className="w-5 h-5" /> Adicionar Aluno
                    </button>
                </div>

                {/* Insight Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <button onClick={() => setStatusFilter('all')} className={`p-4 rounded-xl border flex items-center gap-4 transition-all ${statusFilter === 'all' ? 'bg-gray-100 border-gray-300 shadow-inner' : 'bg-white border-gray-200 hover:shadow-md'}`}>
                        <div className="p-3 bg-gray-100 text-gray-600 rounded-lg"><UsersIcon className="w-6 h-6"/></div>
                        <div className="text-left">
                            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                            <p className="text-xs text-gray-500 font-bold uppercase">Total Alunos</p>
                        </div>
                    </button>
                    <button onClick={() => setStatusFilter('risk')} className={`p-4 rounded-xl border flex items-center gap-4 transition-all ${statusFilter === 'risk' ? 'bg-red-50 border-red-200 shadow-inner' : 'bg-white border-gray-200 hover:shadow-md'}`}>
                        <div className="p-3 bg-red-100 text-red-600 rounded-lg"><AlertTriangleIcon className="w-6 h-6"/></div>
                        <div className="text-left">
                            <p className="text-2xl font-bold text-gray-800">{stats.risk}</p>
                            <p className="text-xs text-red-500 font-bold uppercase">Em Risco</p>
                        </div>
                    </button>
                    <button onClick={() => setStatusFilter('high')} className={`p-4 rounded-xl border flex items-center gap-4 transition-all ${statusFilter === 'high' ? 'bg-green-50 border-green-200 shadow-inner' : 'bg-white border-gray-200 hover:shadow-md'}`}>
                        <div className="p-3 bg-green-100 text-green-600 rounded-lg"><StarIcon className="w-6 h-6"/></div>
                        <div className="text-left">
                            <p className="text-2xl font-bold text-gray-800">{stats.high}</p>
                            <p className="text-xs text-green-600 font-bold uppercase">High Performers</p>
                        </div>
                    </button>
                    <button onClick={() => setStatusFilter('new')} className={`p-4 rounded-xl border flex items-center gap-4 transition-all ${statusFilter === 'new' ? 'bg-blue-50 border-blue-200 shadow-inner' : 'bg-white border-gray-200 hover:shadow-md'}`}>
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><TrendingUpIcon className="w-6 h-6"/></div>
                        <div className="text-left">
                            <p className="text-2xl font-bold text-gray-800">{stats.new}</p>
                            <p className="text-xs text-blue-600 font-bold uppercase">Novos Alunos</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-gray-50 border-b border-gray-200 px-8 py-4 flex items-center gap-4 flex-shrink-0 sticky top-0 z-10">
                <div className="relative flex-grow max-w-md">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar aluno por nome..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm" 
                    />
                </div>
                <select value={selectedCourseId} onChange={e => { setSelectedCourseId(e.target.value); setSelectedClassId(''); }} className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary outline-none text-sm text-gray-700">
                    <option value="">Todos os Cursos</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary outline-none text-sm text-gray-700 disabled:bg-gray-100" disabled={!selectedCourseId}>
                    <option value="">Todas as Turmas</option>
                    {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="ml-auto flex bg-white rounded-lg border border-gray-300 p-1">
                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-gray-100 text-primary' : 'text-gray-400 hover:text-gray-600'}`}><LayoutGridIcon className="w-5 h-5"/></button>
                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-gray-100 text-primary' : 'text-gray-400 hover:text-gray-600'}`}><ClipboardListIcon className="w-5 h-5"/></button>
                </div>
            </div>

            {/* Content */}
            <main className="flex-grow p-8 overflow-y-auto bg-gray-50 custom-scrollbar">
                {isLoading ? (
                    <div className="flex justify-center items-center h-64"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                ) : viewMode === 'list' ? (
                    // LIST VIEW
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aluno</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Curso / Turma</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredStudents.map(student => {
                                    const status = getStudentStatus(student);
                                    return (
                                        <tr key={student.id} onClick={() => setSelectedStudent(student)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <img className="h-10 w-10 rounded-full object-cover mr-3 border border-gray-200" src={student.image_url || `https://ui-avatars.com/api/?name=${student.name}&background=random`} alt="" />
                                                    <div className="text-sm font-bold text-gray-900">{student.name}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full items-center gap-1 ${status.color}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {student.classes?.courses?.name} • {student.classes?.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <span className="text-primary hover:text-primary-dark">Ver Perfil</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    // GRID VIEW
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {filteredStudents.map(student => {
                            const status = getStudentStatus(student);
                            const StatusIcon = status.icon;
                            return (
                                <div 
                                    key={student.id} 
                                    onClick={() => setSelectedStudent(student)}
                                    className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col items-center text-center hover:shadow-lg hover:border-primary/30 hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
                                >
                                    <div className={`absolute top-0 left-0 w-full h-1 ${status.type === 'risk' ? 'bg-red-500' : status.type === 'high' ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                                    
                                    <div className="relative mb-3">
                                        <img className="w-20 h-20 rounded-full object-cover border-4 border-gray-100 group-hover:border-primary/20 transition-colors" src={student.image_url || `https://ui-avatars.com/api/?name=${student.name}&background=random`} alt={student.name} />
                                        <div className={`absolute bottom-0 right-0 p-1.5 rounded-full border-2 border-white ${status.color.replace('text-', 'bg-').split(' ')[0]} text-white`}>
                                            <StatusIcon className="w-3 h-3" />
                                        </div>
                                    </div>
                                    
                                    <h3 className="font-bold text-gray-800 text-lg mb-1">{student.name}</h3>
                                    <p className="text-xs text-gray-500 mb-3">{student.classes?.name || 'Sem Turma'}</p>
                                    
                                    <div className="w-full bg-gray-50 rounded-lg p-2 mb-4 border border-gray-100 flex justify-between text-xs">
                                        <div className="text-center flex-1 border-r border-gray-200">
                                            <p className="text-gray-400 font-bold">XP</p>
                                            <p className="text-gray-700 font-bold">{student.xp || 0}</p>
                                        </div>
                                        <div className="text-center flex-1">
                                            <p className="text-gray-400 font-bold">Nível</p>
                                            <p className="text-gray-700 font-bold">{student.level || 1}</p>
                                        </div>
                                    </div>

                                    <button className="w-full py-2 rounded-lg bg-primary/5 text-primary text-sm font-bold hover:bg-primary hover:text-white transition-colors">
                                        Ver Análise
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {isAddModalOpen && <AddStudentModal onClose={() => setIsAddModalOpen(false)} onStudentAdded={() => {setIsAddModalOpen(false); fetchData();}} />}
            
            {selectedStudent && (
                <StudentProfile 
                    student={selectedStudent} 
                    onClose={() => setSelectedStudent(null)} 
                    onEditRequest={setEditingStudent} 
                    onDeleteRequest={handleDeleteStudent}
                />
            )}
            
            {editingStudent && (
                <EditStudentModal
                    student={editingStudent}
                    onClose={() => setEditingStudent(null)}
                    onSave={handleSaveEdit}
                />
            )}
        </div>
    );
};

export default CrmPage;
