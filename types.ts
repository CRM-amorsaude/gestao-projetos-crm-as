
export enum TaskStatus {
  BACKLOG = 'Backlog',
  DEVELOPMENT = 'Em Desenvolvimento',
  IMPEDIMENT = 'Impedimento',
  REVIEW = 'Em Revisão',
  PUBLICATION = 'Publicação',
  DONE = 'Concluído'
}

export enum TaskPriority {
  LOW = 'Baixa',
  MEDIUM = 'Média',
  HIGH = 'Alta',
  CRITICAL = 'Crítica',
  URGENT = 'Urgente'
}

export enum TaskType {
  TASK = 'Tarefa',
  EPIC = 'Épico',
  STORY = 'História',
  BUG = 'Erro',
  ANALYSIS = 'Análise'
}

export enum SprintStatus {
  PLANNED = 'Planejada',
  ACTIVE = 'Ativa',
  COMPLETED = 'Concluída'
}

export enum UserAccessLevel {
  ADMIN = 'Administrador',
  EDITOR = 'Editor',
  VIEWER = 'Visualizador'
}

export enum OKRStatus {
  NOT_STARTED = 'Não iniciado',
  IN_PROGRESS = 'Em desenvolvimento',
  COMPLETED = 'Concluído',
  AT_RISK = 'Em risco'
}

export enum KRPriority {
  P0 = 'P0 - Crítico',
  P1 = 'P1 - Alta',
  P2 = 'P2 - Média',
  P3 = 'P3 - Baixa'
}

export type NotificationType = 'mention' | 'assignment' | 'status_change';

export interface Notification {
  id: string;
  user_id: string;
  actor_id?: string;
  type: NotificationType;
  entity_type: 'task' | 'comment';
  entity_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  task_code?: string;
  task_title?: string;
  actor_name?: string;
  actor_avatar?: string;
  comment_snippet?: string;
}

export interface TaskLink {
  id: string;
  from_task_id: string;
  to_task_id: string;
  relation_type: string;
  created_at: string;
}

export interface OKR {
  id: string;
  title: string;
  objective: string;
  quarter: 'T1' | 'T2' | 'T3' | 'T4';
  progress: number;
  status: OKRStatus;
  justification: string;
  year: number;
}

export interface KeyResult {
  id: string;
  okrId: string;
  title: string;
  responsibleId: string;
  priority: KRPriority;
  squads: string[];
  goalDescription: string;
  status: OKRStatus;
  startDate: string;
  endDate: string;
  progress: number;
  taskIds: string[];
}

export interface User {
  id: string;
  name: string;
  role: string;
  accessLevel?: UserAccessLevel;
  avatar: string;
  email: string;
  squad: string;
  joinDate: string;
  status: 'Ativo' | 'Inativo';
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: User;
}

export interface ActivityLog {
  id: string;
  task_id: string;
  user_id: string;
  field_name: string;
  old_value: string;
  new_value: string;
  action_type: string;
  created_at: string;
  user?: User;
}

export interface Sprint {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  goal?: string;
  status: SprintStatus;
}

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  responsible: User;
  reporter: User;
  parentEpic?: string;
  squad: string;
  dueDate?: string;
  description: string;
  project: string;
  sprintId?: string;
  comments?: Comment[];
  activities?: ActivityLog[];
}

export interface ProjectStats {
  myTasks: number;
  inProgress: number;
  inQA: number;
  blocked: number;
}
