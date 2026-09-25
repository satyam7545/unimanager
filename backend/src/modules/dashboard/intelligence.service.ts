import { Task, Assignment, Event, Subject } from '@prisma/client';

export interface PrioritizedTask extends Task {
  priorityScore: number;
  priorityReason: string;
  calculatedPriority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  subject?: { id: string; name: string; color: string } | null;
  assignment?: { id: string; title: string; deadline?: Date } | null;
  project?: { id: string; name: string } | null;
}

export interface PrioritizedAssignment extends Assignment {
  priorityScore: number;
  priorityReason: string;
  calculatedPriority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  subject?: { id: string; name: string; color: string } | null;
}

export interface WorkRecommendation {
  id: string;
  type: 'TASK' | 'ASSIGNMENT' | 'STUDY_SESSION';
  title: string;
  subjectName: string;
  subjectColor: string;
  subjectId?: string | null;
  recommendedMinutes: number;
  reason: string;
  urgencyLevel: 'HIGH' | 'MEDIUM' | 'NORMAL';
  taskId?: string;
  assignmentId?: string;
}

export interface SubjectHealth {
  id: string;
  name: string;
  color: string;
  status: 'HEALTHY' | 'NEEDS_ATTENTION' | 'AT_RISK';
  completionRate: number; // 0 to 100
  overdueCount: number;
  upcomingExamDays: number | null;
  reasons: string[];
}

export interface WorkloadMetrics {
  classHours: number;
  assignmentHours: number;
  taskHours: number;
  totalHours: number;
  capacityHours: number;
  loadPercentage: number;
  isOverloaded: boolean;
  advice: string;
}

export interface OverdueItem {
  id: string;
  type: 'TASK' | 'ASSIGNMENT';
  title: string;
  subjectName: string;
  subjectColor: string;
  dueDate: Date;
  daysOverdue: number;
  estimatedMinutes: number;
}

export class IntelligenceService {
  /**
   * Determine if an event represents an exam or quiz
   */
  isExamEvent(event: Event): boolean {
    if (event.eventType && event.eventType.toUpperCase() === 'EXAM') return true;
    const lower = event.title.toLowerCase();
    return lower.includes('exam') || lower.includes('midterm') || lower.includes('final') || lower.includes('quiz') || lower.includes('test');
  }

  /**
   * Prioritize tasks with an explainable algorithm
   */
  prioritizeTasks(
    tasks: (Task & {
      subject?: { id: string; name: string; color: string } | null;
      assignment?: { id: string; title: string; deadline?: Date; subjectId?: string | null } | null;
      project?: { id: string; name: string } | null;
    })[],
    upcomingExams: Event[]
  ): PrioritizedTask[] {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    return tasks.map((task) => {
      let score = 20;
      const reasons: string[] = [];

      // Base priority from user
      if (task.priority === 'URGENT') score += 35;
      else if (task.priority === 'HIGH') score += 25;
      else if (task.priority === 'MEDIUM') score += 15;

      // In progress task gets priority
      if (task.status === 'IN_PROGRESS') {
        score += 25;
        reasons.push('Currently In Progress');
      }

      // Date factors
      if (task.date) {
        const taskDate = new Date(task.date);
        if (taskDate < startOfToday && task.status !== 'DONE') {
          score += 45;
          const daysOverdue = Math.max(1, Math.floor((startOfToday.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24)));
          reasons.push(`Overdue by ${daysOverdue}d`);
        } else if (taskDate >= startOfToday && taskDate <= endOfToday) {
          score += 30;
          reasons.push('Scheduled for today');
        }
      }

      // Subject Exam Proximity
      const effectiveSubjectId = task.subjectId || task.assignment?.subjectId;
      if (effectiveSubjectId) {
        const matchingExam = upcomingExams.find(
          (ex) => ex.subjectId === effectiveSubjectId && new Date(ex.startAt) >= now
        );
        if (matchingExam) {
          const daysUntilExam = Math.max(0, Math.ceil((new Date(matchingExam.startAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          if (daysUntilExam <= 3) {
            score += 35;
            reasons.push(`Exam in ${daysUntilExam}d!`);
          } else if (daysUntilExam <= 7) {
            score += 20;
            reasons.push(`Exam in ${daysUntilExam}d`);
          }
        }
      }

      // Linked Assignment Proximity
      if (task.assignment?.deadline) {
        const dl = new Date(task.assignment.deadline);
        const hoursLeft = (dl.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursLeft < 0) {
          score += 30;
          reasons.push('Assignment overdue');
        } else if (hoursLeft <= 24) {
          score += 25;
          reasons.push('Assignment due in <24h');
        } else if (hoursLeft <= 48) {
          score += 15;
          reasons.push('Assignment due in 2d');
        }
      }

      // Duration factor
      const estMin = task.estimatedMinutes || 30;
      reasons.push(`${estMin}m est`);

      // Determine human label
      let calculatedPriority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      if (score >= 70) calculatedPriority = 'URGENT';
      else if (score >= 50) calculatedPriority = 'HIGH';
      else if (score >= 35) calculatedPriority = 'MEDIUM';

      return {
        ...task,
        priorityScore: score,
        priorityReason: reasons.slice(0, 3).join(' · '),
        calculatedPriority,
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }

  /**
   * Prioritize assignments based on deadline proximity, effort, and upcoming exams
   */
  prioritizeAssignments(
    assignments: (Assignment & {
      subject?: { id: string; name: string; color: string } | null;
    })[],
    upcomingExams: Event[]
  ): PrioritizedAssignment[] {
    const now = new Date();

    return assignments.map((ass) => {
      let score = 20;
      const reasons: string[] = [];
      const deadline = new Date(ass.deadline);
      const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      const daysLeft = Math.ceil(hoursLeft / 24);

      if (ass.priority === 'URGENT') score += 30;
      else if (ass.priority === 'HIGH') score += 20;
      else if (ass.priority === 'MEDIUM') score += 10;

      if (hoursLeft < 0) {
        score += 55;
        const daysOver = Math.max(1, Math.floor(Math.abs(hoursLeft) / 24));
        reasons.push(`Overdue by ${daysOver}d`);
      } else if (hoursLeft <= 24) {
        score += 45;
        reasons.push(`Due in ${Math.max(1, Math.round(hoursLeft))}h`);
      } else if (hoursLeft <= 48) {
        score += 35;
        reasons.push('Due tomorrow');
      } else if (daysLeft <= 4) {
        score += 25;
        reasons.push(`Due in ${daysLeft}d`);
      } else if (daysLeft <= 7) {
        score += 15;
        reasons.push(`Due in ${daysLeft}d`);
      }

      // Exam proximity in the same subject
      if (ass.subjectId) {
        const matchingExam = upcomingExams.find(
          (ex) => ex.subjectId === ass.subjectId && new Date(ex.startAt) >= now
        );
        if (matchingExam) {
          const daysToExam = Math.max(0, Math.ceil((new Date(matchingExam.startAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          if (daysToExam <= 7) {
            score += 20;
            reasons.push(`Exam in ${daysToExam}d`);
          }
        }
      }

      const estHours = ass.estimatedHours || 2.0;
      reasons.push(`${estHours}h est`);

      let calculatedPriority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      if (score >= 70) calculatedPriority = 'URGENT';
      else if (score >= 50) calculatedPriority = 'HIGH';
      else if (score >= 35) calculatedPriority = 'MEDIUM';

      return {
        ...ass,
        priorityScore: score,
        priorityReason: reasons.slice(0, 3).join(' · '),
        calculatedPriority,
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }

  /**
   * "What Should I Work On Right Now?" — Contextual Recommendation
   */
  getWhatToWorkOnNow(
    prioritizedTasks: PrioritizedTask[],
    prioritizedAssignments: PrioritizedAssignment[],
    upcomingExams: (Event & { subject?: { id: string; name: string; color: string } | null })[]
  ): WorkRecommendation | null {
    const now = new Date();

    // 1. In-progress task
    const inProgressTask = prioritizedTasks.find((t) => t.status === 'IN_PROGRESS');
    if (inProgressTask) {
      return {
        id: inProgressTask.id,
        type: 'TASK',
        title: inProgressTask.title,
        subjectName: inProgressTask.subject?.name || inProgressTask.assignment?.title || 'Current Task',
        subjectColor: inProgressTask.subject?.color || '#8B5CF6',
        subjectId: inProgressTask.subjectId || null,
        recommendedMinutes: inProgressTask.estimatedMinutes || 30,
        reason: 'You already have this in progress. Continuing momentum is the fastest way to get it finished.',
        urgencyLevel: 'HIGH',
        taskId: inProgressTask.id,
      };
    }

    // 2. Urgent or Overdue task
    const topUrgentTask = prioritizedTasks.find((t) => t.status !== 'DONE' && t.priorityScore >= 65);
    if (topUrgentTask) {
      return {
        id: topUrgentTask.id,
        type: 'TASK',
        title: topUrgentTask.title,
        subjectName: topUrgentTask.subject?.name || topUrgentTask.assignment?.title || 'Priority Task',
        subjectColor: topUrgentTask.subject?.color || '#8B5CF6',
        subjectId: topUrgentTask.subjectId || null,
        recommendedMinutes: Math.min(topUrgentTask.estimatedMinutes || 30, 45),
        reason: `Highest priority item: ${topUrgentTask.priorityReason}. A focused session will resolve this bottleneck.`,
        urgencyLevel: 'HIGH',
        taskId: topUrgentTask.id,
      };
    }

    // 3. Urgent Assignment due in < 48 hours
    const urgentAssignment = prioritizedAssignments.find((a) => a.status !== 'COMPLETED' && a.priorityScore >= 60);
    if (urgentAssignment) {
      return {
        id: urgentAssignment.id,
        type: 'ASSIGNMENT',
        title: urgentAssignment.title,
        subjectName: urgentAssignment.subject?.name || 'Assignment',
        subjectColor: urgentAssignment.subject?.color || '#3B82F6',
        subjectId: urgentAssignment.subjectId || null,
        recommendedMinutes: 45,
        reason: `${urgentAssignment.title} is due soon (${urgentAssignment.priorityReason}). Start a 45-minute block to make meaningful progress.`,
        urgencyLevel: 'HIGH',
        assignmentId: urgentAssignment.id,
      };
    }

    // 4. Upcoming Exam within 5 days requiring study session
    const urgentExam = upcomingExams.find((ex) => {
      const days = Math.ceil((new Date(ex.startAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 5;
    });
    if (urgentExam) {
      const days = Math.max(0, Math.ceil((new Date(urgentExam.startAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      return {
        id: urgentExam.id,
        type: 'STUDY_SESSION',
        title: `${urgentExam.subject?.name || 'Course'} Revision`,
        subjectName: urgentExam.subject?.name || urgentExam.title,
        subjectColor: urgentExam.subject?.color || '#F59E0B',
        subjectId: urgentExam.subjectId || null,
        recommendedMinutes: 45,
        reason: `Your ${urgentExam.title} is in ${days === 0 ? 'today' : days + ' day' + (days > 1 ? 's' : '')}. Recommended revision session: 45 minutes.`,
        urgencyLevel: 'HIGH',
      };
    }

    // 5. Next highest prioritized planned task
    const nextTask = prioritizedTasks.find((t) => t.status !== 'DONE');
    if (nextTask) {
      return {
        id: nextTask.id,
        type: 'TASK',
        title: nextTask.title,
        subjectName: nextTask.subject?.name || 'Planned Task',
        subjectColor: nextTask.subject?.color || '#10B981',
        subjectId: nextTask.subjectId || null,
        recommendedMinutes: nextTask.estimatedMinutes || 25,
        reason: `Next up on your schedule (${nextTask.priorityReason || 'Planned'}). Tackle it now with a quick focus session.`,
        urgencyLevel: 'NORMAL',
        taskId: nextTask.id,
      };
    }

    return null;
  }

  /**
   * Semester Health Matrix per Subject
   */
  getSemesterHealth(
    subjects: (Subject & {
      assignments: Assignment[];
      tasks: Task[];
      events: Event[];
    })[]
  ): SubjectHealth[] {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return subjects.map((subj) => {
      const reasons: string[] = [];
      let overdueCount = 0;

      // Overdue assignments
      const overdueAssignments = subj.assignments.filter(
        (a) => a.status !== 'COMPLETED' && new Date(a.deadline) < now
      );
      overdueCount += overdueAssignments.length;
      if (overdueAssignments.length > 0) {
        reasons.push(`${overdueAssignments.length} overdue assignment${overdueAssignments.length > 1 ? 's' : ''}`);
      }

      // Overdue tasks
      const overdueTasks = subj.tasks.filter(
        (t) => t.status !== 'DONE' && t.date && new Date(t.date) < startOfToday
      );
      overdueCount += overdueTasks.length;
      if (overdueTasks.length > 0) {
        reasons.push(`${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`);
      }

      // Completion Rate
      const totalItems = subj.assignments.length + subj.tasks.length;
      const completedItems =
        subj.assignments.filter((a) => a.status === 'COMPLETED').length +
        subj.tasks.filter((t) => t.status === 'DONE').length;
      const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 100;

      // Upcoming exams
      let upcomingExamDays: number | null = null;
      const upcomingExams = subj.events
        .filter((e) => this.isExamEvent(e) && new Date(e.startAt) >= now)
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

      if (upcomingExams.length > 0) {
        const days = Math.max(0, Math.ceil((new Date(upcomingExams[0].startAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        upcomingExamDays = days;
        reasons.push(`Exam in ${days}d`);
      }

      // Status determination
      let status: 'HEALTHY' | 'NEEDS_ATTENTION' | 'AT_RISK' = 'HEALTHY';
      if (overdueCount >= 2 || (upcomingExamDays !== null && upcomingExamDays <= 4 && completionRate < 60)) {
        status = 'AT_RISK';
      } else if (overdueCount >= 1 || (upcomingExamDays !== null && upcomingExamDays <= 7) || completionRate < 65) {
        status = 'NEEDS_ATTENTION';
      }

      if (reasons.length === 0) {
        reasons.push('All coursework on schedule', `${completionRate}% completed`);
      }

      return {
        id: subj.id,
        name: subj.name,
        color: subj.color,
        status,
        completionRate,
        overdueCount,
        upcomingExamDays,
        reasons,
      };
    });
  }

  /**
   * Workload vs Capacity Analysis
   */
  getWorkloadAnalysis(
    tasks: Task[],
    assignments: Assignment[],
    events: Event[]
  ): WorkloadMetrics {
    const now = new Date();
    const endOfWeek = new Date();
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    // Class hours this week
    let classMinutes = 0;
    events.forEach((ev) => {
      const eventStart = new Date(ev.startAt);
      if (eventStart >= now && eventStart <= endOfWeek) {
        const isClass = (ev.eventType && ev.eventType.toUpperCase() === 'CLASS') || (!ev.isAllDay && !this.isExamEvent(ev));
        if (isClass) {
          const duration = (new Date(ev.endAt).getTime() - eventStart.getTime()) / (1000 * 60);
          classMinutes += Math.max(30, duration);
        }
      }
    });

    // Assignment hours due this week
    let assignmentHours = 0;
    assignments.forEach((ass) => {
      const dl = new Date(ass.deadline);
      if (ass.status !== 'COMPLETED' && dl >= now && dl <= endOfWeek) {
        assignmentHours += ass.estimatedHours || 2.0;
      }
    });

    // Tasks scheduled this week
    let taskMinutes = 0;
    tasks.forEach((t) => {
      if (t.status !== 'DONE' && t.date) {
        const taskDate = new Date(t.date);
        if (taskDate >= now && taskDate <= endOfWeek) {
          taskMinutes += t.estimatedMinutes || 30;
        }
      }
    });

    const classHours = Number((classMinutes / 60).toFixed(1));
    const taskHours = Number((taskMinutes / 60).toFixed(1));
    const totalHours = Number((classHours + assignmentHours + taskHours).toFixed(1));
    const capacityHours = 35.0; // Standard student workload capacity per week
    const loadPercentage = Math.round((totalHours / capacityHours) * 100);
    const isOverloaded = totalHours > capacityHours;

    let advice = 'Your weekly study and coursework schedule is well balanced.';
    if (isOverloaded) {
      const diff = (totalHours - capacityHours).toFixed(1);
      advice = `⚠️ Your planned load (${totalHours}h) exceeds standard capacity by ~${diff}h. Consider rescheduling non-urgent tasks.`;
    } else if (loadPercentage > 85) {
      advice = `Schedule is getting tight (${loadPercentage}% capacity). Keep focus sessions short and targeted.`;
    }

    return {
      classHours,
      assignmentHours: Number(assignmentHours.toFixed(1)),
      taskHours,
      totalHours,
      capacityHours,
      loadPercentage,
      isOverloaded,
      advice,
    };
  }

  /**
   * Overdue Items for supportive recovery
   */
  getOverdueRecovery(
    tasks: (Task & { subject?: { name: string; color: string } | null; assignment?: { title: string } | null })[],
    assignments: (Assignment & { subject?: { name: string; color: string } | null })[]
  ): OverdueItem[] {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const overdueList: OverdueItem[] = [];

    // Overdue tasks
    tasks.forEach((t) => {
      if (t.status !== 'DONE' && t.date) {
        const taskDate = new Date(t.date);
        if (taskDate < startOfToday) {
          const daysOverdue = Math.max(1, Math.floor((startOfToday.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24)));
          overdueList.push({
            id: t.id,
            type: 'TASK',
            title: t.title,
            subjectName: t.subject?.name || t.assignment?.title || 'Task',
            subjectColor: t.subject?.color || '#8B5CF6',
            dueDate: taskDate,
            daysOverdue,
            estimatedMinutes: t.estimatedMinutes || 30,
          });
        }
      }
    });

    // Overdue assignments
    assignments.forEach((a) => {
      if (a.status !== 'COMPLETED') {
        const dl = new Date(a.deadline);
        if (dl < now) {
          const daysOverdue = Math.max(1, Math.floor((now.getTime() - dl.getTime()) / (1000 * 60 * 60 * 24)));
          overdueList.push({
            id: a.id,
            type: 'ASSIGNMENT',
            title: a.title,
            subjectName: a.subject?.name || 'Assignment',
            subjectColor: a.subject?.color || '#EC4899',
            dueDate: dl,
            daysOverdue,
            estimatedMinutes: Math.round((a.estimatedHours || 2.0) * 60),
          });
        }
      }
    });

    return overdueList.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }
}

export const intelligenceService = new IntelligenceService();
