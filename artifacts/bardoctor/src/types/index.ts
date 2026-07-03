export type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

export type TaskStatus = 'active' | 'completed';

export type Task = {
  id: string;
  title: string;
  category: string;
  status: TaskStatus;
  date: string;
};

export type EquipmentStatus = 'working' | 'maintenance';

export type Equipment = {
  id: string;
  name: string;
  status: EquipmentStatus;
  lastService: string;
};
