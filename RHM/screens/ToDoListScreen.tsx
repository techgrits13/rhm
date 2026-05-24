import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';

const TODO_STORAGE_KEY = 'rhm_admin_todo_list';

interface TodoItem {
  id: string;
  task: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

const INITIAL_TASKS: TodoItem[] = [
  { id: '1', task: 'Reaction counts on Breaking News', completed: true, priority: 'high' },
  { id: '2', task: 'Push notification redirect fix', completed: true, priority: 'high' },
  { id: '3', task: 'Bible screen: OT/NT Picker', completed: true, priority: 'high' },
  { id: '4', task: 'Bible screen: 2-column grid', completed: true, priority: 'high' },
  { id: '5', task: 'Bible screen: Offline support', completed: true, priority: 'high' },
  { id: '6', task: 'Direct Uploads to Supabase Storage', completed: true, priority: 'high' },
  { id: '7', task: 'Update to new Supabase Project ID (tlcer...)', completed: true, priority: 'high' },
  { id: '8', task: 'AdMob Compliance Review (NativeAdCard)', completed: true, priority: 'medium' },
  { id: '9', task: 'Hidden Admin URL Setting (Shield Tap)', completed: true, priority: 'low' },
  { id: '10', task: 'Deploy Edge Functions to Cloud', completed: false, priority: 'high' },
  { id: '11', task: 'Verify Supabase Storage Buckets', completed: false, priority: 'medium' },
];

export default function ToDoListScreen() {
  const { colors } = useTheme();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    try {
      const stored = await AsyncStorage.getItem(TODO_STORAGE_KEY);
      if (stored) {
        setTodos(JSON.parse(stored));
      } else {
        setTodos(INITIAL_TASKS);
        await saveTodos(INITIAL_TASKS);
      }
    } catch (e) {
      console.error('Failed to load todos', e);
    } finally {
      setLoading(false);
    }
  };

  const saveTodos = async (updatedTodos: TodoItem[]) => {
    try {
      await AsyncStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(updatedTodos));
    } catch (e) {
      console.error('Failed to save todos', e);
    }
  };

  const addTodo = async () => {
    if (!newTask.trim()) return;
    const newTodo: TodoItem = {
      id: Date.now().toString(),
      task: newTask.trim(),
      completed: false,
      priority: 'medium',
    };
    const updated = [newTodo, ...todos];
    setTodos(updated);
    await saveTodos(updated);
    setNewTask('');
  };

  const toggleTodo = async (id: string) => {
    const updated = todos.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    setTodos(updated);
    await saveTodos(updated);
  };

  const deleteTodo = async (id: string) => {
    Alert.alert('Delete Task', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = todos.filter(t => t.id !== id);
          setTodos(updated);
          await saveTodos(updated);
        },
      },
    ]);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 20,
    },
    inputContainer: {
      flexDirection: 'row',
      marginBottom: 20,
    },
    input: {
      flex: 1,
      backgroundColor: colors.card,
      color: colors.text,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 10,
    },
    addButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      width: 50,
      justifyContent: 'center',
      alignItems: 'center',
    },
    todoItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      padding: 15,
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    todoText: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      marginLeft: 10,
    },
    completedText: {
      textDecorationLine: 'line-through',
      color: colors.placeholder,
    },
    priorityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginLeft: 10,
    },
    priorityText: {
      fontSize: 10,
      fontWeight: 'bold',
      color: '#fff',
    },
  });

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RHM Development To-Do</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="New task..."
          placeholderTextColor={colors.placeholder}
          value={newTask}
          onChangeText={setNewTask}
        />
        <TouchableOpacity style={styles.addButton} onPress={addTodo}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={todos}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.todoItem} onPress={() => toggleTodo(item.id)}>
            <Ionicons
              name={item.completed ? 'checkbox' : 'square-outline'}
              size={24}
              color={item.completed ? colors.success : colors.placeholder}
            />
            <Text style={[styles.todoText, item.completed && styles.completedText]}>
              {item.task}
            </Text>
            <View style={[
              styles.priorityBadge,
              { backgroundColor: item.priority === 'high' ? '#e74c3c' : item.priority === 'medium' ? '#f39c12' : '#2ecc71' }
            ]}>
              <Text style={styles.priorityText}>{item.priority.toUpperCase()}</Text>
            </View>
            <TouchableOpacity onPress={() => deleteTodo(item.id)} style={{ marginLeft: 15 }}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
