export interface LogItem {
  day: number;
  id: number;
  desc: string;
  performer?: string;
  targetAgents?: string[];
  action: any;
}
