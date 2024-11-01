const mongoose = require('mongoose');

// Define the schema
const taskSchema = new mongoose.Schema({
  id: { type: String, required: true },  // Keeping id as String if it's a custom ID
  title: { type: String, required: true },
  date: { type: String, required: true },  // Use Date type for better date handling
  dueDate: { type: String, required: true },  // Use Date type here as well
  technology: { type: String, required: true },
  description: { type: String, required: true },
  images: { type: [String], required: false },  // Mark as not required if images are optional
  status: { type: String, enum: ['New', 'Pending', 'Success'], default: 'New' },
  hasViewedDescription: { type: Boolean, default: false }
}, {
  collection: 'task_collection' // Explicitly set the collection name
});

// Create the model
const Task = mongoose.model('Task', taskSchema, 'task_collection');

module.exports = Task;
