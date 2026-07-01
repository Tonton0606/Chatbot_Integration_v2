const fs = require('fs');
const path = require('path');
const file = 'client/src/pages/Admin/AdminChatbot.jsx';
const content = fs.readFileSync(file, 'utf8');

const startLiveChat = content.indexOf('function LiveChatTest({');
const startDraggable = content.indexOf('function DraggableChatHead({');
const startAdmin = content.indexOf('export default function AdminChatbot() {');

const liveChatCode = content.substring(startLiveChat, startDraggable);
const draggableCode = content.substring(startDraggable, startAdmin);

// Write to files
const imports = `import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Bot, X, Send, User, ChevronDown, RefreshCw, Copy, Check, Info, Trash2, ArrowRight, Activity, Calendar, Layout, Search, Sparkles, Loader2, PlayCircle, StopCircle, Mic, MicOff, Settings2, ShieldAlert, Cpu, Maximize2, Minimize2, Settings, FileText, ChevronRight } from 'lucide-react';
import { supabase } from '../../../config/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
`;

fs.mkdirSync('client/src/components/chat', { recursive: true });

// For LiveChatTest
const liveChatFile = imports + '\n' + liveChatCode.trim() + '\n\nexport default LiveChatTest;\n';
fs.writeFileSync('client/src/components/chat/LiveChatTest.jsx', liveChatFile);

// For DraggableChatHead
const draggableFile = imports + '\nimport LiveChatTest from "./LiveChatTest";\n\n' + draggableCode.trim() + '\n\nexport default DraggableChatHead;\n';
fs.writeFileSync('client/src/components/chat/DraggableChatHead.jsx', draggableFile);

// Update AdminChatbot.jsx
const preLiveChat = content.substring(0, startLiveChat);
const postAdmin = content.substring(startAdmin);
const newAdmin = preLiveChat + 'import LiveChatTest from "../../components/chat/LiveChatTest";\nimport DraggableChatHead from "../../components/chat/DraggableChatHead";\n\n' + postAdmin;
fs.writeFileSync(file, newAdmin);

console.log('Successfully extracted components.');
