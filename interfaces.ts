export interface Task {
  content: string;
  status: string;
}

export interface Sequence {
  code: string;
}

export interface Shot {
  code: string;
  sequence: Sequence;
  description: string;
  tasks: Task[];
}
