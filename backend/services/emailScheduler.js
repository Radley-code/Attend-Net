const cron = require('node-cron');
const emailController = require('../controllers/emailController');

class EmailScheduler {
  constructor() {
    this.tasks = [];
    this.initializeSchedules();
  }

  initializeSchedules() {
    // Schedule weekly summaries for Sunday at 9:00 AM
    const weeklySummaryTask = cron.schedule('0 9 * * 0', async () => {
      console.log('Running weekly email summary scheduler...');
      try {
        const result = await emailController.sendWeeklySummaries();
        console.log('Weekly summaries sent:', result);
        
        // Emit socket event for real-time updates
        const io = require('../utils/socket').getIO();
        if (io) {
          io.emit('weeklySummariesSent', result);
        }
      } catch (error) {
        console.error('Error in weekly summary scheduler:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC' // You can change this to your timezone
    });

    this.tasks.push({
      name: 'weeklySummaries',
      task: weeklySummaryTask,
      schedule: 'Every Sunday at 9:00 AM UTC'
    });

    // Start the scheduler
    weeklySummaryTask.start();
    console.log('Email scheduler initialized - Weekly summaries scheduled for Sunday 9:00 AM UTC');
  }

  // Add custom schedule
  addCustomSchedule(cronExpression, callback, name) {
    try {
      const task = cron.schedule(cronExpression, callback, {
        scheduled: false,
        timezone: 'UTC'
      });

      this.tasks.push({
        name: name || 'custom',
        task: task,
        schedule: cronExpression
      });

      task.start();
      console.log(`Custom schedule '${name}' added: ${cronExpression}`);
      
      return { success: true, taskId: this.tasks.length - 1 };
    } catch (error) {
      console.error('Error adding custom schedule:', error);
      return { success: false, error: error.message };
    }
  }

  // Stop a specific task
  stopTask(taskName) {
    try {
      const taskIndex = this.tasks.findIndex(t => t.name === taskName);
      if (taskIndex === -1) {
        return { success: false, error: 'Task not found' };
      }

      this.tasks[taskIndex].task.stop();
      return { success: true, message: `Task '${taskName}' stopped` };
    } catch (error) {
      console.error('Error stopping task:', error);
      return { success: false, error: error.message };
    }
  }

  // Start a specific task
  startTask(taskName) {
    try {
      const taskIndex = this.tasks.findIndex(t => t.name === taskName);
      if (taskIndex === -1) {
        return { success: false, error: 'Task not found' };
      }

      this.tasks[taskIndex].task.start();
      return { success: true, message: `Task '${taskName}' started` };
    } catch (error) {
      console.error('Error starting task:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all tasks status
  getTasksStatus() {
    return this.tasks.map(task => ({
      name: task.name,
      schedule: task.schedule,
      running: task.task.running || false
    }));
  }

  // Destroy all tasks
  destroyAll() {
    this.tasks.forEach(task => {
      if (task.task && typeof task.task.stop === 'function') {
        task.task.stop();
      }
      if (task.task && typeof task.task.destroy === 'function') {
        task.task.destroy();
      }
    });
    this.tasks = [];
    console.log('All email scheduler tasks destroyed');
  }

  // Test weekly summaries (for manual testing)
  async testWeeklySummaries() {
    console.log('Testing weekly summaries manually...');
    try {
      const result = await emailController.sendWeeklySummaries();
      console.log('Test weekly summaries result:', result);
      return result;
    } catch (error) {
      console.error('Error testing weekly summaries:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailScheduler();
