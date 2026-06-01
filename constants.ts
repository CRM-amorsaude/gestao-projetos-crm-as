
import { Task, TaskStatus, TaskPriority, TaskType, User, Sprint, SprintStatus } from './types';

export const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'Dr. Lucas Silva',
    role: 'Líder de Projeto',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas',
    email: 'lucas.silva@amorsaude.com.br',
    squad: 'Estratégia CRM',
    joinDate: '2022-01-15',
    status: 'Ativo'
  },
  {
    id: '2',
    name: 'Maria Lopez',
    role: 'Engenheira de Backend',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
    email: 'maria.lopez@amorsaude.com.br',
    squad: 'Núcleo de Banco de Dados',
    joinDate: '2023-03-20',
    status: 'Ativo'
  },
  {
    id: '3',
    name: 'João Costa',
    role: 'Especialista em Segurança',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Joao',
    email: 'joao.costa@amorsaude.com.br',
    squad: 'Crescimento',
    joinDate: '2022-11-02',
    status: 'Ativo'
  },
  {
    id: '4',
    name: 'Ricardo Lima',
    role: 'Pesquisador de UX',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ricardo',
    email: 'ricardo.lima@amorsaude.com.br',
    squad: 'App Mobile',
    joinDate: '2023-06-12',
    status: 'Ativo'
  }
];

export const MOCK_SPRINTS: Sprint[] = [
  {
    id: 'S-01',
    name: 'Sprint 1',
    startDate: '2023-10-15',
    endDate: '2023-10-29',
    status: SprintStatus.ACTIVE,
    goal: 'Lançamento do MVP de Telemedicina'
  },
  {
    id: 'S-02',
    name: 'Sprint 2',
    startDate: '2023-10-30',
    endDate: '2023-11-13',
    status: SprintStatus.PLANNED,
    goal: 'Melhorias de segurança e MFA'
  }
];

export const MOCK_TASKS: Task[] = [
  {
    id: 'CRM-102',
    title: 'Módulo de migração de dados de pacientes para registros legados',
    type: TaskType.TASK,
    status: TaskStatus.DEVELOPMENT,
    priority: TaskPriority.CRITICAL,
    responsible: MOCK_USERS[1],
    reporter: MOCK_USERS[0],
    parentEpic: 'Migração Nuvem 2024',
    squad: 'Núcleo de Banco de Dados',
    dueDate: '2023-10-28',
    project: 'Migração de Dados',
    description: 'Migração de registros de pacientes do sistema legado V1 para a nova infraestrutura em nuvem.',
    sprintId: 'S-01'
  },
  {
    id: 'CRM-105',
    title: 'Ajuste de Feedback de UI e Acessibilidade da Telemedicina',
    type: TaskType.STORY,
    status: TaskStatus.REVIEW,
    priority: TaskPriority.HIGH,
    responsible: MOCK_USERS[3],
    reporter: MOCK_USERS[0],
    parentEpic: 'Expansão TeleSaúde',
    squad: 'App Mobile',
    dueDate: '2023-10-30',
    project: 'Telemedicina',
    description: 'Garantir que a interface de Telemedicina atenda aos padrões WCAG 2.1 AA e melhorar os loops de feedback dos botões.',
    sprintId: 'S-01'
  },
  {
    id: 'CRM-110',
    title: 'Documentação da API de Faturamento e Configuração de Sandbox',
    type: TaskType.BUG,
    status: TaskStatus.IMPEDIMENT,
    priority: TaskPriority.MEDIUM,
    responsible: MOCK_USERS[2],
    reporter: MOCK_USERS[1],
    parentEpic: 'Gateway Financeiro V2',
    squad: 'Serviço Financeiro',
    dueDate: '2023-11-02',
    project: 'Integrações Financeiras',
    description: 'Documentar endpoints para a nova API de faturamento e configurar o ambiente de homologação.',
    sprintId: 'S-02'
  },
  {
    id: 'CRM-124',
    title: 'Implementar autenticação multifator para médicos',
    type: TaskType.STORY,
    status: TaskStatus.BACKLOG,
    priority: TaskPriority.URGENT,
    responsible: MOCK_USERS[0],
    reporter: MOCK_USERS[2],
    parentEpic: 'Reforço de Segurança',
    squad: 'Crescimento',
    dueDate: '2023-11-05',
    project: 'Reformulação de Segurança',
    description: 'Implementação de MFA via SMS e E-mail para o portal do profissional de saúde.'
  }
];
