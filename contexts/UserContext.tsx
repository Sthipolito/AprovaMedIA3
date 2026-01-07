import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { UserRole, UserContextType, Student } from '../types';
import * as academicService from '../services/academicService';

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [userRole, setUserRole] = useState<UserRole>({ role: 'teacher' });
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStudents = async () => {
            setIsLoading(true);
            const students = await academicService.getAllStudentsWithDetails();
            setAllStudents(students);
            setIsLoading(false);
        };
        fetchStudents();
    }, []);

    const value = { userRole, setUserRole, allStudents };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = (): UserContextType => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
