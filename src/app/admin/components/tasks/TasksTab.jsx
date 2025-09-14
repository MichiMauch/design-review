import { useMemo } from 'react';
import TaskFilter from './TaskFilter';
import TaskCard from './TaskCard';
import EmptyTaskState from './EmptyTaskState';

export default function TasksTab({ tasks, projects, allProjects, filter, onFilterChange, r2Url }) {
  const filteredTasks = useMemo(() => {
    if (filter === 'all') return tasks;
    return tasks.filter(item => item.project_id.toString() === filter);
  }, [tasks, filter]);

  return (
    <div>
      <TaskFilter
        filter={filter}
        projects={projects}
        allProjects={allProjects}
        onFilterChange={onFilterChange}
      />

      <div className="space-y-6">
        {filteredTasks.length === 0 ? (
          <EmptyTaskState />
        ) : (
          filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} r2Url={r2Url} />
          ))
        )}
      </div>
    </div>
  );
}