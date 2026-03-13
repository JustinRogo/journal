import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Plus,
  X,
  Save,
  Pencil,
  Trash,
  LogIn,
  LogOut,
  User,
  Moon,
  Sun,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Quote,
  Link as LinkIcon,
  Undo2,
  Redo2,
  PenLine,
  Eraser,
  Trash2,
  Palette,
  Image as ImageIcon,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { EditorContent, ReactRenderer, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import suggestion, { exitSuggestion } from "@tiptap/suggestion";
import { Extension } from "@tiptap/core";
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";

const SUPABASE_URL = "https://gfrnxcxjyxxgdslcpfih.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_u4MHlmKlRPrD3NZhlT93og_aBtmJKJY";
const DRAWING_SIZE = 700;
const DRAWINGS_BUCKET = "journal-drawings";

const isSupabaseConfigured =
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_ANON_KEY.startsWith("sb_");

const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

function formatDateKey(dateLike) {
  const d = new Date(dateLike);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthLabel(date) {
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function getMonthGrid(currentMonth) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const startDay = firstOfMonth.getDay();
  const daysInMonth = lastOfMonth.getDate();
  const cells = [];

  for (let i = 0; i < startDay; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

function datetimeLocalNow() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function drawBackground(ctx, backgroundColor = "#ffffff") {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, DRAWING_SIZE, DRAWING_SIZE);
  ctx.restore();
}

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function getPublicDrawingUrl(path) {
  if (!supabase || !path) return "";
  const { data } = supabase.storage.from(DRAWINGS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function SlashCommandList(props) {
  const { items, command, isDarkMode, selectedIndex = 0 } = props;

  if (!items.length) {
    return null;
  }

  return (
    <div
      className={`min-w-[220px] rounded-2xl border p-2 shadow-2xl ${
        isDarkMode
          ? "border-stone-700 bg-stone-900 text-stone-100"
          : "border-stone-200 bg-white text-stone-900"
      }`}
    >
      <div className="mb-1 px-2 pt-1 text-[11px] uppercase tracking-[0.18em] text-stone-400">
        Insert block
      </div>
      <div className="space-y-1">
        {items.map((item, index) => (
          <button
            key={item.title}
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              command(item);
            }}
            className={`flex w-full items-start rounded-xl px-3 py-2 text-left text-sm ${
              index === selectedIndex
                ? isDarkMode
                  ? "bg-stone-800 text-stone-100"
                  : "bg-stone-100 text-stone-900"
                : isDarkMode
                  ? "text-stone-300 hover:bg-stone-800"
                  : "text-stone-700 hover:bg-stone-50"
            }`}
          >
            <div>
              <div className="font-medium">{item.title}</div>
              <div className="text-xs text-stone-400">{item.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function createSlashCommandExtension(slashItems, isDarkMode) {
  return Extension.create({
    name: "slashCommands",
    addProseMirrorPlugins() {
      return [
        suggestion({
          editor: this.editor,
          char: "/",
          startOfLine: false,
          allowSpaces: true,
          items: ({ query }) => {
            const q = query.toLowerCase().trim();
            return slashItems
              .filter((item) => {
                if (!q) return true;
                return (
                  item.title.toLowerCase().includes(q) ||
                  item.searchTerms.some((term) => term.toLowerCase().includes(q))
                );
              })
              .slice(0, 8);
          },
          command: ({ editor, range, props }) => {
            editor.chain().focus().deleteRange(range).run();

            if (props.commandName === "h1") {
              editor.chain().focus().toggleHeading({ level: 1 }).run();
              return;
            }
            if (props.commandName === "h2") {
              editor.chain().focus().toggleHeading({ level: 2 }).run();
              return;
            }
            if (props.commandName === "bullet") {
              editor.chain().focus().toggleBulletList().run();
              return;
            }
            if (props.commandName === "numbered") {
              editor.chain().focus().toggleOrderedList().run();
              return;
            }
            if (props.commandName === "quote") {
              editor.chain().focus().toggleBlockquote().run();
            }
          },
          render: () => {
            let component;
            let popup;
            let selectedIndex = 0;

            const updateProps = (props) => {
              component?.updateProps({
                ...props,
                isDarkMode,
                selectedIndex,
              });
            };

            const selectItem = (props, index) => {
              const item = props.items[index];
              if (item) {
                props.command(item);
              }
            };

            return {
              onStart: (props) => {
                selectedIndex = 0;
                component = new ReactRenderer(SlashCommandList, {
                  props: {
                    ...props,
                    isDarkMode,
                    selectedIndex,
                  },
                  editor: props.editor,
                });

                if (!props.clientRect) return;

                popup = tippy(document.body, {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: "manual",
                  placement: "bottom-start",
                });
              },
              onUpdate: (props) => {
                selectedIndex = 0;
                updateProps(props);

                if (!props.clientRect || !popup?.[0]) return;
                popup[0].setProps({ getReferenceClientRect: props.clientRect });
              },
              onKeyDown: (props) => {
                if (props.event.key === "Escape") {
                  popup?.[0]?.hide();
                  exitSuggestion(props.editor.view, "slashCommands");
                  return true;
                }

                if (props.event.key === "ArrowUp") {
                  selectedIndex = ((selectedIndex + props.items.length) - 1) % props.items.length;
                  updateProps(props);
                  return true;
                }

                if (props.event.key === "ArrowDown") {
                  selectedIndex = (selectedIndex + 1) % props.items.length;
                  updateProps(props);
                  return true;
                }

                if (props.event.key === "Enter") {
                  selectItem(props, selectedIndex);
                  return true;
                }

                return false;
              },
              onExit: () => {
                popup?.[0]?.destroy();
                component?.destroy();
              },
            };
          },
        }),
      ];
    },
  });
}

function EntryMenu({ entry, session, isDarkMode, onEdit, onDelete, onToggleVisibility }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("touchstart", handlePointerDown);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (session?.user?.id !== entry.user_id) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label="Entry options"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full border ${isDarkMode ? "border-stone-600 bg-stone-900 text-stone-200 hover:bg-stone-700" : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100"}`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className={`absolute right-0 top-9 z-30 w-44 overflow-hidden rounded-2xl border shadow-xl ${isDarkMode ? "border-stone-700 bg-stone-900" : "border-stone-200 bg-white"}`}>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className={`block w-full px-4 py-3 text-left text-sm ${isDarkMode ? "text-stone-100 hover:bg-stone-800" : "text-stone-700 hover:bg-stone-50"}`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onToggleVisibility();
            }}
            className={`block w-full border-y px-4 py-3 text-left text-sm ${isDarkMode ? "border-stone-700 text-stone-100 hover:bg-stone-800" : "border-stone-200 text-stone-700 hover:bg-stone-50"}`}
          >
            {entry.visibility === "public" ? "Make Private" : "Make Public"}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className={`block w-full px-4 py-3 text-left text-sm ${isDarkMode ? "text-red-300 hover:bg-red-950/30" : "text-red-600 hover:bg-red-50"}`}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function DrawingCanvas({ isDarkMode, value, onChange, backgroundColor, onBackgroundColorChange }) {
  const canvasRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);

  const [strokeColor, setStrokeColor] = useState("#111827");
  const [brushSize, setBrushSize] = useState(12);
  const [brushOpacity, setBrushOpacity] = useState(0.22);
  const [brushSoftness, setBrushSoftness] = useState(0.7);
  const [blendMode, setBlendMode] = useState("source-over");
  const [tool, setTool] = useState("pen");
  const [historyTick, setHistoryTick] = useState(0);

  function ensureDrawingCanvas() {
    if (!drawingCanvasRef.current) {
      const offscreen = document.createElement("canvas");
      offscreen.width = DRAWING_SIZE;
      offscreen.height = DRAWING_SIZE;
      drawingCanvasRef.current = offscreen;
    }
    return drawingCanvasRef.current;
  }

  function getDisplayContext() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }

  function getDrawingContext() {
    const canvas = ensureDrawingCanvas();
    return canvas.getContext("2d");
  }

  function serializeDisplayCanvas() {
    if (!canvasRef.current) return "";
    return canvasRef.current.toDataURL("image/png");
  }

  function serializeDrawingLayer() {
    const canvas = ensureDrawingCanvas();
    return canvas.toDataURL("image/png");
  }

  function renderComposite() {
    const displayCtx = getDisplayContext();
    const drawingCanvas = ensureDrawingCanvas();
    if (!displayCtx || !drawingCanvas) return;

    displayCtx.clearRect(0, 0, DRAWING_SIZE, DRAWING_SIZE);
    drawBackground(displayCtx, backgroundColor);
    displayCtx.drawImage(drawingCanvas, 0, 0, DRAWING_SIZE, DRAWING_SIZE);
  }

  function pushHistory(dataUrl) {
    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    nextHistory.push(dataUrl);
    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;
    setHistoryTick((tick) => tick + 1);
  }

  function emitCurrentImage() {
    onChange(serializeDisplayCanvas());
  }

  function clearDrawingLayer(push = true) {
    const drawingCtx = getDrawingContext();
    if (!drawingCtx) return;
    drawingCtx.clearRect(0, 0, DRAWING_SIZE, DRAWING_SIZE);
    renderComposite();
    if (push) {
      pushHistory(serializeDrawingLayer());
    }
  }

  function loadDrawingLayer(dataUrl, push = false) {
    const drawingCtx = getDrawingContext();
    if (!drawingCtx) return;

    drawingCtx.clearRect(0, 0, DRAWING_SIZE, DRAWING_SIZE);

    if (!dataUrl) {
      renderComposite();
      if (push) pushHistory(serializeDrawingLayer());
      return;
    }

    const img = new Image();
    img.onload = () => {
      drawingCtx.clearRect(0, 0, DRAWING_SIZE, DRAWING_SIZE);
      drawingCtx.drawImage(img, 0, 0, DRAWING_SIZE, DRAWING_SIZE);
      renderComposite();
      if (push) pushHistory(serializeDrawingLayer());
    };
    img.src = dataUrl;
  }

  useEffect(() => {
    const displayCanvas = canvasRef.current;
    if (!displayCanvas) return;

    const displayCtx = displayCanvas.getContext("2d");
    displayCtx.lineCap = "round";
    displayCtx.lineJoin = "round";

    const drawingCanvas = ensureDrawingCanvas();
    const drawingCtx = drawingCanvas.getContext("2d");
    drawingCtx.lineCap = "round";
    drawingCtx.lineJoin = "round";

    clearDrawingLayer(false);
    historyRef.current = [serializeDrawingLayer()];
    historyIndexRef.current = 0;
    setHistoryTick((tick) => tick + 1);
    emitCurrentImage();
  }, []);

  useEffect(() => {
    renderComposite();
    emitCurrentImage();
  }, [backgroundColor]);

  function hexToRgba(hex, alpha = 1) {
    const normalized = hex.replace("#", "");
    const expanded = normalized.length === 3 ? normalized.split("").map((c) => c + c).join("") : normalized;
    const bigint = parseInt(expanded, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function stampBrush(ctx, x, y) {
    const radius = Math.max(brushSize / 2, 1);
    const innerRadius = Math.max(radius * (1 - brushSoftness), 0.5);
    const gradient = ctx.createRadialGradient(x, y, innerRadius, x, y, radius);
    gradient.addColorStop(0, hexToRgba(strokeColor, brushOpacity));
    gradient.addColorStop(1, hexToRgba(strokeColor, 0));

    ctx.save();
    ctx.globalCompositeOperation = blendMode;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function eraseBrush(ctx, x, y) {
    const radius = Math.max(brushSize / 2, 1);
    const innerRadius = Math.max(radius * 0.25, 0.5);
    const gradient = ctx.createRadialGradient(x, y, innerRadius, x, y, radius);
    gradient.addColorStop(0, `rgba(0, 0, 0, ${Math.min(brushOpacity + 0.25, 1)})`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function stampAlongPath(ctx, from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);
    const step = Math.max(brushSize * 0.12, 1);
    const steps = Math.max(Math.ceil(distance / step), 1);

    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const x = from.x + dx * t;
      const y = from.y + dy * t;
      if (tool === "eraser") {
        eraseBrush(ctx, x, y);
      } else {
        stampBrush(ctx, x, y);
      }
    }
  }

  function applyBrushPreset(nextTool) {
    if (nextTool === "pen") {
      setBlendMode("source-over");
      setBrushOpacity(0.95);
      setBrushSoftness(0.1);
      return;
    }
    if (nextTool === "marker") {
      setBlendMode("multiply");
      setBrushOpacity(0.18);
      setBrushSoftness(0.45);
      return;
    }
    if (nextTool === "airbrush") {
      setBlendMode("source-over");
      setBrushOpacity(0.08);
      setBrushSoftness(0.95);
      return;
    }
    if (nextTool === "paint") {
      setBlendMode("multiply");
      setBrushOpacity(0.28);
      setBrushSoftness(0.7);
    }
  }

  function getPoint(event) {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    const scaleX = DRAWING_SIZE / rect.width;
    const scaleY = DRAWING_SIZE / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function beginStroke(event) {
    event.preventDefault();
    const drawingCtx = getDrawingContext();
    const point = getPoint(event);
    if (!drawingCtx || !point) return;

    isDrawingRef.current = true;
    lastPointRef.current = point;

    if (tool === "eraser") {
      eraseBrush(drawingCtx, point.x, point.y);
    } else {
      stampBrush(drawingCtx, point.x, point.y);
    }
    renderComposite();
  }

  function drawStroke(event) {
    if (!isDrawingRef.current) return;
    event.preventDefault();

    const drawingCtx = getDrawingContext();
    const point = getPoint(event);
    const lastPoint = lastPointRef.current;
    if (!drawingCtx || !point || !lastPoint) return;

    stampAlongPath(drawingCtx, lastPoint, point);
    lastPointRef.current = point;
    renderComposite();
  }

  function endStroke() {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    pushHistory(serializeDrawingLayer());
    emitCurrentImage();
  }

  function clearCanvas() {
    clearDrawingLayer(true);
    emitCurrentImage();
  }

  function undoCanvas() {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    setHistoryTick((tick) => tick + 1);
    loadDrawingLayer(historyRef.current[historyIndexRef.current], false);
    setTimeout(() => {
      emitCurrentImage();
    }, 0);
  }

  const canUndo = historyIndexRef.current > 0 || historyTick > 0;

  return (
    <div className={`rounded-2xl border ${isDarkMode ? "border-stone-700 bg-stone-900" : "border-stone-300 bg-white"}`}>
      <div className={`flex flex-wrap items-center gap-3 border-b p-3 ${isDarkMode ? "border-stone-700" : "border-stone-200"}`}>
        <div className="inline-flex items-center gap-2 text-sm">
          <Palette className="h-4 w-4" />
          <span className={isDarkMode ? "text-stone-200" : "text-stone-700"}>Background</span>
          <input
            type="color"
            value={backgroundColor}
            onChange={(e) => onBackgroundColorChange(e.target.value)}
            className="h-9 w-10 cursor-pointer rounded-md border border-stone-400 bg-transparent p-1"
          />
        </div>
        <div className="inline-flex items-center gap-2 text-sm">
          <Palette className="h-4 w-4" />
          <span className={isDarkMode ? "text-stone-200" : "text-stone-700"}>Color</span>
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
            className="h-9 w-10 cursor-pointer rounded-md border border-stone-400 bg-transparent p-1"
          />
        </div>
        <div className="inline-flex items-center gap-2 text-sm">
          <span className={isDarkMode ? "text-stone-200" : "text-stone-700"}>Brush</span>
          <input
            type="range"
            min="1"
            max="60"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-32"
          />
          <span className={`w-8 text-xs ${isDarkMode ? "text-stone-400" : "text-stone-500"}`}>{brushSize}</span>
        </div>
        <div className="inline-flex items-center gap-2 text-sm">
          <span className={isDarkMode ? "text-stone-200" : "text-stone-700"}>Opacity</span>
          <input
            type="range"
            min="0.02"
            max="1"
            step="0.01"
            value={brushOpacity}
            onChange={(e) => setBrushOpacity(Number(e.target.value))}
            className="w-32"
          />
          <span className={`w-10 text-xs ${isDarkMode ? "text-stone-400" : "text-stone-500"}`}>{Math.round(brushOpacity * 100)}%</span>
        </div>
        <div className="inline-flex items-center gap-2 text-sm">
          <span className={isDarkMode ? "text-stone-200" : "text-stone-700"}>Softness</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={brushSoftness}
            onChange={(e) => setBrushSoftness(Number(e.target.value))}
            className="w-32"
          />
          <span className={`w-10 text-xs ${isDarkMode ? "text-stone-400" : "text-stone-500"}`}>{Math.round(brushSoftness * 100)}%</span>
        </div>
        <div className="inline-flex items-center gap-2 text-sm">
          <span className={isDarkMode ? "text-stone-200" : "text-stone-700"}>Blend</span>
          <select
            value={blendMode}
            onChange={(e) => setBlendMode(e.target.value)}
            className={`rounded-lg border px-2 py-1 text-sm ${isDarkMode ? "border-stone-600 bg-stone-800 text-stone-100" : "border-stone-300 bg-white text-stone-700"}`}
          >
            <option value="source-over">Normal</option>
            <option value="multiply">Multiply</option>
            <option value="screen">Screen</option>
            <option value="overlay">Overlay</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => {
            setTool("pen");
            applyBrushPreset("pen");
          }}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${tool === "pen" ? (isDarkMode ? "border-stone-200 bg-stone-100 text-stone-900" : "border-stone-800 bg-stone-800 text-white") : (isDarkMode ? "border-stone-600 bg-stone-800 text-stone-100" : "border-stone-300 bg-white text-stone-700")}`}
        >
          <PenLine className="h-4 w-4" />
          Pen
        </button>
        <button
          type="button"
          onClick={() => {
            setTool("marker");
            applyBrushPreset("marker");
          }}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${tool === "marker" ? (isDarkMode ? "border-stone-200 bg-stone-100 text-stone-900" : "border-stone-800 bg-stone-800 text-white") : (isDarkMode ? "border-stone-600 bg-stone-800 text-stone-100" : "border-stone-300 bg-white text-stone-700")}`}
        >
          <Palette className="h-4 w-4" />
          Marker
        </button>
        <button
          type="button"
          onClick={() => {
            setTool("paint");
            applyBrushPreset("paint");
          }}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${tool === "paint" ? (isDarkMode ? "border-stone-200 bg-stone-100 text-stone-900" : "border-stone-800 bg-stone-800 text-white") : (isDarkMode ? "border-stone-600 bg-stone-800 text-stone-100" : "border-stone-300 bg-white text-stone-700")}`}
        >
          <PenLine className="h-4 w-4" />
          Paint
        </button>
        <button
          type="button"
          onClick={() => {
            setTool("airbrush");
            applyBrushPreset("airbrush");
          }}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${tool === "airbrush" ? (isDarkMode ? "border-stone-200 bg-stone-100 text-stone-900" : "border-stone-800 bg-stone-800 text-white") : (isDarkMode ? "border-stone-600 bg-stone-800 text-stone-100" : "border-stone-300 bg-white text-stone-700")}`}
        >
          <Palette className="h-4 w-4" />
          Airbrush
        </button>
        <button
          type="button"
          onClick={() => setTool("eraser")}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${tool === "eraser" ? (isDarkMode ? "border-stone-200 bg-stone-100 text-stone-900" : "border-stone-800 bg-stone-800 text-white") : (isDarkMode ? "border-stone-600 bg-stone-800 text-stone-100" : "border-stone-300 bg-white text-stone-700")}`}
        >
          <Eraser className="h-4 w-4" />
          Eraser
        </button>
        <button
          type="button"
          onClick={undoCanvas}
          disabled={!canUndo}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${isDarkMode ? "border-stone-600 bg-stone-800 text-stone-100" : "border-stone-300 bg-white text-stone-700"}`}
        >
          <Undo2 className="h-4 w-4" />
          Undo
        </button>
        <button
          type="button"
          onClick={clearCanvas}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${isDarkMode ? "border-stone-600 bg-stone-800 text-stone-100" : "border-stone-300 bg-white text-stone-700"}`}
        >
          <Trash2 className="h-4 w-4" />
          Clear
        </button>
      </div>

      <div className="overflow-x-auto p-3">
        <div className="min-w-[700px]">
        <canvas
          ref={canvasRef}
          width={DRAWING_SIZE}
          height={DRAWING_SIZE}
          onMouseDown={beginStroke}
          onMouseMove={drawStroke}
          onMouseUp={endStroke}
          onMouseLeave={endStroke}
          onTouchStart={beginStroke}
          onTouchMove={drawStroke}
          onTouchEnd={endStroke}
          className={`aspect-square w-full min-w-[700px] touch-none rounded-2xl border shadow-inner ${isDarkMode ? "border-stone-700 bg-white" : "border-stone-300 bg-white"}`}
        />
        </div>
      </div>
    </div>
  );
}

export default function JournalApp() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [form, setForm] = useState({
    occurred_at: datetimeLocalNow(),
    content: "",
    drawing_data: "",
    visibility: "public",
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("journal-dark-mode");
    return saved === null ? true : saved === "true";
  });
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const [drawingBackgroundColor, setDrawingBackgroundColor] = useState("#ffffff");
  const [removeExistingDrawing, setRemoveExistingDrawing] = useState(false);

  const slashItems = useMemo(
    () => [
      {
        title: "Heading 1",
        description: "Large section heading",
        searchTerms: ["h1", "heading", "title"],
        commandName: "h1",
      },
      {
        title: "Heading 2",
        description: "Medium section heading",
        searchTerms: ["h2", "heading", "subtitle"],
        commandName: "h2",
      },
      {
        title: "Bullet List",
        description: "Create a bulleted list",
        searchTerms: ["bullet", "list", "ul"],
        commandName: "bullet",
      },
      {
        title: "Numbered List",
        description: "Create a numbered list",
        searchTerms: ["numbered", "ordered", "list", "ol"],
        commandName: "numbered",
      },
      {
        title: "Blockquote",
        description: "Emphasized quoted text",
        searchTerms: ["quote", "blockquote", "callout"],
        commandName: "quote",
      },
    ],
    []
  );

  const editorClassName = useMemo(
    () =>
      `journal-editor min-h-[220px] w-full rounded-b-2xl px-4 py-4 outline-none ${
        isDarkMode ? "bg-stone-900 text-stone-100" : "bg-white text-stone-800"
      }`,
    [isDarkMode]
  );

  const editorExtensions = useMemo(
    () => [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Placeholder.configure({
        placeholder: "Write a short journal entry...",
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        defaultProtocol: "https",
      }),
      createSlashCommandExtension(slashItems, isDarkMode),
    ],
    [slashItems, isDarkMode]
  );

  const editor = useEditor({
    extensions: editorExtensions,
    content: "",
    editorProps: {
      attributes: {
        class: editorClassName,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setForm((prev) => ({ ...prev, content: html }));
    },
    immediatelyRender: false,
  });

  async function loadEntries() {
    if (!supabase) {
      setLoading(false);
      setEntries([]);
      return;
    }

    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("journal_entries")
      .select("id, user_id, occurred_at, content, image_path, visibility, created_at")
      .order("occurred_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setEntries([]);
    } else {
      setEntries(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!editor) return;
    editor.setOptions({
      editorProps: {
        attributes: {
          class: editorClassName,
        },
      },
    });
  }, [editor, editorClassName]);

  useEffect(() => {
    if (!editor || !isModalOpen) return;
    editor.commands.setContent(form.content || "", false);
  }, [editor, isModalOpen]);

  useEffect(() => {
    localStorage.setItem("journal-dark-mode", String(isDarkMode));
  }, [isDarkMode]);

  const visibleEntries = useMemo(() => {
    return entries.filter((entry) => entry.visibility !== "private" || entry.user_id === session?.user?.id);
  }, [entries, session]);

  const countsByDate = useMemo(() => {
    const counts = {};
    for (const entry of visibleEntries) {
      const key = formatDateKey(entry.occurred_at);
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [visibleEntries]);

  const filteredEntries = useMemo(() => {
    if (!selectedDate) return visibleEntries;
    const key = formatDateKey(selectedDate);
    return visibleEntries.filter((entry) => formatDateKey(entry.occurred_at) === key);
  }, [visibleEntries, selectedDate]);

  const monthCells = useMemo(() => getMonthGrid(currentMonth), [currentMonth]);

  function openEditEntryModal(entry) {
    const occurred = new Date(entry.occurred_at);
    const offset = occurred.getTimezoneOffset();
    const local = new Date(occurred.getTime() - offset * 60000);

    setForm({
      occurred_at: local.toISOString().slice(0, 16),
      content: entry.content || "",
      drawing_data: entry.image_path ? getPublicDrawingUrl(entry.image_path) : "",
      visibility: entry.visibility || "public",
    });

    setEditingEntryId(entry.id);
    setIsDrawingOpen(!!entry.image_path);
    setDrawingBackgroundColor("#ffffff");
    setRemoveExistingDrawing(false);
    setIsModalOpen(true);

    if (editor) {
      editor.commands.setContent(entry.content || "", false);
      setTimeout(() => editor.commands.focus(), 0);
    }
  }

  function openNewEntryModal(prefillDate = null) {
    const base = prefillDate ? new Date(prefillDate) : new Date();
    const combined = new Date(base);
    const now = new Date();
    combined.setHours(now.getHours(), now.getMinutes(), 0, 0);
    const offset = combined.getTimezoneOffset();
    const local = new Date(combined.getTime() - offset * 60000);

    const nextForm = {
      occurred_at: local.toISOString().slice(0, 16),
      content: "",
      drawing_data: "",
      visibility: session?.user ? "private" : "public",
    };
    setDrawingBackgroundColor("#ffffff");
    setIsDrawingOpen(false);
    setEditingEntryId(null);
    setRemoveExistingDrawing(false);
    setForm(nextForm);
    setIsModalOpen(true);
    setError("");
    if (editor) {
      editor.commands.setContent("", false);
      editor.commands.focus();
    }
  }

  async function handlePasswordSignIn(e) {
    e.preventDefault();
    if (!supabase) return;

    if (!email.trim() || !password.trim()) {
      setError("Enter email and password.");
      return;
    }

    setError("");
    setAuthMessage("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setAuthMessage("Signed in successfully.");
  }

  async function handleSignUp(e) {
    e.preventDefault();
    if (!supabase) return;

    if (!email.trim() || !password.trim()) {
      setError("Enter email and password.");
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setAuthMessage("Account created. You can now sign in.");
  }

  async function handleSignOut() {
    if (!supabase) return;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      return;
    }
    setAuthMessage("");
  }

  async function handleDeleteEntry(entry) {
    if (!session?.user || !supabase) return;
    const confirmed = window.confirm("Delete this journal entry?");
    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("journal_entries")
      .delete()
      .eq("id", entry.id)
      .eq("user_id", session.user.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (entry.image_path) {
      await supabase.storage.from(DRAWINGS_BUCKET).remove([entry.image_path]);
    }

    await loadEntries();
  }

  async function handleToggleVisibility(entry) {
    if (!session?.user || !supabase) return;
    const newVisibility = entry.visibility === "public" ? "private" : "public";

    const { error: updateError } = await supabase
      .from("journal_entries")
      .update({ visibility: newVisibility })
      .eq("id", entry.id)
      .eq("user_id", session.user.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await loadEntries();
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    const user = session?.user;
    if (!user) {
      setError("You must be signed in to post journal entries.");
      return;
    }

    const hasText = form.content.replace(/<[^>]*>/g, "").trim().length > 0;
    const hasImage = !!form.drawing_data;

    if (!form.occurred_at || (!hasText && !hasImage)) {
      setError("Please add a date/time and either journal text or a drawing.");
      return;
    }

    setSaving(true);
    setError("");

    const originalEntry = editingEntryId ? entries.find((entry) => entry.id === editingEntryId) : null;
    const originalImagePath = originalEntry?.image_path || null;
    const originalImageUrl = originalImagePath ? getPublicDrawingUrl(originalImagePath) : "";
    let imagePath = originalImagePath;

    if (removeExistingDrawing) {
      imagePath = null;
    } else if (form.drawing_data) {
      if (!(editingEntryId && originalImagePath && form.drawing_data === originalImageUrl)) {
        const drawingBlob = dataUrlToBlob(form.drawing_data);
        imagePath = `${user.id}/${Date.now()}.png`;

        const { error: uploadError } = await supabase.storage
          .from(DRAWINGS_BUCKET)
          .upload(imagePath, drawingBlob, {
            contentType: "image/png",
            upsert: false,
          });

        if (uploadError) {
          setError(uploadError.message);
          setSaving(false);
          return;
        }
      }
    }

    if (editingEntryId) {
      const shouldDeleteOldImage = originalImagePath && (removeExistingDrawing || (imagePath && imagePath !== originalImagePath));
      const { error: updateError } = await supabase
        .from("journal_entries")
        .update({
          occurred_at: new Date(form.occurred_at).toISOString(),
          content: form.content,
          image_path: imagePath,
          visibility: form.visibility,
        })
        .eq("id", editingEntryId)
        .eq("user_id", user.id);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      if (shouldDeleteOldImage) {
        await supabase.storage.from(DRAWINGS_BUCKET).remove([originalImagePath]);
      }
    } else {
      const { error: insertError } = await supabase.from("journal_entries").insert([
        {
          user_id: user.id,
          occurred_at: new Date(form.occurred_at).toISOString(),
          content: form.content,
          image_path: imagePath,
          visibility: form.visibility,
        },
      ]);

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }
    }

    setIsModalOpen(false);
    setEditingEntryId(null);
    setForm({ occurred_at: datetimeLocalNow(), content: "", drawing_data: "", visibility: session?.user ? "private" : "public" });
    setDrawingBackgroundColor("#ffffff");
    setIsDrawingOpen(false);
    setRemoveExistingDrawing(false);
    if (editor) {
      editor.commands.setContent("", false);
    }
    await loadEntries();
    setSaving(false);
  }

  function runEditorCommand(command) {
    if (!editor) return;

    if (command === "bold") return editor.chain().focus().toggleBold().run();
    if (command === "italic") return editor.chain().focus().toggleItalic().run();
    if (command === "bulletList") return editor.chain().focus().toggleBulletList().run();
    if (command === "orderedList") return editor.chain().focus().toggleOrderedList().run();
    if (command === "heading1") return editor.chain().focus().toggleHeading({ level: 1 }).run();
    if (command === "heading2") return editor.chain().focus().toggleHeading({ level: 2 }).run();
    if (command === "blockquote") return editor.chain().focus().toggleBlockquote().run();

    if (command === "link") {
      const previousUrl = editor.getAttributes("link").href || "";
      const url = window.prompt("Enter a URL", previousUrl);

      if (url === null) return;
      if (url.trim() === "") return editor.chain().focus().unsetLink().run();

      return editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
    }

    if (command === "undo") return editor.chain().focus().undo().run();
    if (command === "redo") return editor.chain().focus().redo().run();
  }

  return (
    <>
      <style>{`
        .journal-editor h1 {
          font-size: 1.5rem;
          line-height: 2rem;
          font-weight: 700;
          margin: 1rem 0 0.5rem;
        }

        .journal-editor h2 {
          font-size: 1.25rem;
          line-height: 1.75rem;
          font-weight: 700;
          margin: 0.875rem 0 0.5rem;
        }

        .journal-editor p {
          margin: 0.5rem 0;
        }

        .journal-editor ul,
        .journal-editor ol {
          margin: 0.75rem 0;
          padding-left: 1.5rem;
        }

        .journal-editor ul {
          list-style-type: disc;
        }

        .journal-editor ol {
          list-style-type: decimal;
        }

        .journal-editor li {
          margin: 0.25rem 0;
        }

        .journal-editor blockquote {
          margin: 0.875rem 0;
          padding-left: 1rem;
          border-left: 3px solid ${isDarkMode ? "rgb(87 83 78)" : "rgb(214 211 209)"};
          color: ${isDarkMode ? "rgb(214 211 209)" : "rgb(87 83 78)"};
          font-style: italic;
        }

        .journal-editor a {
          text-decoration: underline;
          text-underline-offset: 2px;
          color: ${isDarkMode ? "rgb(191 219 254)" : "rgb(29 78 216)"};
        }

        .journal-editor .is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: ${isDarkMode ? "rgb(120 113 108)" : "rgb(168 162 158)"};
          pointer-events: none;
          height: 0;
        }
      `}</style>
      <div className={isDarkMode ? "min-h-screen bg-stone-950 text-stone-100" : "min-h-screen bg-stone-100 text-stone-800"}>
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
          <div className={`relative mb-6 overflow-hidden rounded-[2rem] border shadow-sm ${isDarkMode ? "border-stone-700 bg-stone-900" : "border-stone-300 bg-[#f8f1e3]"}`}>
            <div className={`absolute inset-0 ${isDarkMode ? "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.05),transparent_28%)]" : "bg-[radial-gradient(circle_at_top_left,rgba(120,53,15,0.10),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(120,53,15,0.08),transparent_28%)]"}`} />
            <div className="relative grid gap-6 px-6 py-7 md:grid-cols-[1.2fr_0.8fr] md:px-8">
              <div>
                <div className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.24em] ${isDarkMode ? "border-stone-700 bg-stone-800 text-stone-300" : "border-stone-300 bg-white/70 text-stone-600"}`}>
                  <Calendar className="h-4 w-4" />
                  Journal Archive
                </div>
                <h1 className="font-serif text-4xl leading-tight md:text-5xl">Daily Notes</h1>
                <p className={`mt-3 max-w-2xl text-sm md:text-base ${isDarkMode ? "text-stone-400" : "text-stone-600"}`}>
                  A quiet place for public entries, sketches, and passing thoughts — with private posting tools tucked behind your sign-in.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <div className={`rounded-full border px-3 py-1 text-xs ${isDarkMode ? "border-stone-700 bg-stone-800 text-stone-300" : "border-stone-300 bg-white/70 text-stone-600"}`}>
                    Rich text
                  </div>
                  <div className={`rounded-full border px-3 py-1 text-xs ${isDarkMode ? "border-stone-700 bg-stone-800 text-stone-300" : "border-stone-300 bg-white/70 text-stone-600"}`}>
                    Drawings
                  </div>
                  <div className={`rounded-full border px-3 py-1 text-xs ${isDarkMode ? "border-stone-700 bg-stone-800 text-stone-300" : "border-stone-300 bg-white/70 text-stone-600"}`}>
                    Calendar view
                  </div>
                </div>
              </div>

              <div className={`rounded-[1.75rem] border p-4 md:p-5 ${isDarkMode ? "border-stone-700 bg-stone-950/70" : "border-stone-300 bg-white/80 backdrop-blur"}`}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <div className={`text-xs uppercase tracking-[0.22em] ${isDarkMode ? "text-stone-500" : "text-stone-500"}`}>
                      Studio Controls
                    </div>
                    <div className="mt-1 text-lg font-medium">Account & appearance</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDarkMode((prev) => !prev)}
                    className={`inline-flex items-center justify-center gap-2 rounded-full border px-3 py-2 text-sm ${isDarkMode ? "border-stone-700 bg-stone-800 text-stone-100" : "border-stone-300 bg-white text-stone-700"}`}
                  >
                    {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {isDarkMode ? "Light" : "Dark"}
                  </button>
                </div>

                {session?.user ? (
                  <div className="space-y-4">
                    <div className={`rounded-2xl border p-4 ${isDarkMode ? "border-stone-700 bg-stone-900" : "border-stone-200 bg-stone-50"}`}>
                      <div className={`mb-1 text-xs uppercase tracking-[0.18em] ${isDarkMode ? "text-stone-500" : "text-stone-500"}`}>
                        Signed in
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isDarkMode ? "bg-stone-800 text-stone-200" : "bg-stone-200 text-stone-700"}`}>
                          <User className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{session.user.email}</div>
                          <div className={`text-xs ${isDarkMode ? "text-stone-400" : "text-stone-500"}`}>
                            Private posting enabled
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        onClick={() => openNewEntryModal()}
                        className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm transition hover:-translate-y-0.5 ${isDarkMode ? "border-stone-200 bg-stone-100 text-stone-900" : "border-stone-700 bg-stone-800 text-white"}`}
                      >
                        <Plus className="h-4 w-4" />
                        New Entry
                      </button>
                      <button
                        onClick={handleSignOut}
                        className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm ${isDarkMode ? "border-stone-700 bg-stone-800 text-stone-200 hover:bg-stone-700" : "border-stone-300 bg-white hover:bg-stone-50"}`}
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className={`rounded-2xl border p-4 ${isDarkMode ? "border-stone-700 bg-stone-900" : "border-stone-200 bg-stone-50"}`}>
                      <div className={`mb-1 text-xs uppercase tracking-[0.18em] ${isDarkMode ? "text-stone-500" : "text-stone-500"}`}>
                        Private access
                      </div>
                      <p className={`text-sm ${isDarkMode ? "text-stone-300" : "text-stone-600"}`}>
                        Sign in to publish entries, drawings, and edits. Visitors can still browse everything you’ve posted.
                      </p>
                    </div>
                    <form onSubmit={handlePasswordSignIn} className="space-y-3">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none ${isDarkMode ? "border-stone-700 bg-stone-800 text-stone-100 placeholder:text-stone-400 focus:border-stone-300" : "border-stone-300 bg-white focus:border-stone-800"}`}
                      />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none ${isDarkMode ? "border-stone-700 bg-stone-800 text-stone-100 placeholder:text-stone-400 focus:border-stone-300" : "border-stone-300 bg-white focus:border-stone-800"}`}
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          type="submit"
                          disabled={authLoading}
                          className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium disabled:opacity-60 ${isDarkMode ? "border-stone-200 bg-stone-100 text-stone-900" : "border-stone-700 bg-stone-800 text-white"}`}
                        >
                          <LogIn className="h-4 w-4" />
                          Sign In
                        </button>
                        <button
                          type="button"
                          onClick={handleSignUp}
                          className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm ${isDarkMode ? "border-stone-700 bg-stone-800 text-stone-200" : "border-stone-300 bg-white"}`}
                        >
                          Create Account
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>

          {authMessage && (
            <div className={`mb-6 rounded-2xl border p-4 text-sm ${isDarkMode ? "border-emerald-800 bg-emerald-950 text-emerald-200" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}>
              {authMessage}
            </div>
          )}

          {error && (
            <div className={`mb-6 rounded-2xl border p-4 text-sm ${isDarkMode ? "border-red-800 bg-red-950 text-red-200" : "border-red-300 bg-red-50 text-red-800"}`}>
              {error}
            </div>
          )}

          {!session?.user && (
            <div className={`mb-6 rounded-2xl border p-4 text-sm ${isDarkMode ? "border-blue-900 bg-blue-950 text-blue-200" : "border-blue-200 bg-blue-50 text-blue-900"}`}>
              Visitors can read entries. Sign in with your email to post new ones.
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <section className={`rounded-3xl border p-4 shadow-sm sm:p-5 ${isDarkMode ? "border-stone-700 bg-stone-900" : "border-stone-300 bg-white"}`}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <button
                  className={`rounded-xl border px-3 py-2 text-sm sm:px-4 ${isDarkMode ? "border-stone-700 text-stone-200 hover:bg-stone-800" : "border-stone-300 hover:bg-stone-50"}`}
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                >
                  Prev
                </button>
                <h2 className="font-serif text-xl sm:text-2xl md:text-3xl">{formatMonthLabel(currentMonth)}</h2>
                <button
                  className={`rounded-xl border px-3 py-2 text-sm ${isDarkMode ? "border-stone-700 text-stone-200 hover:bg-stone-800" : "border-stone-300 hover:bg-stone-50"}`}
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                >
                  Next
                </button>
              </div>

              <div className={`mb-2 hidden grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide sm:grid ${isDarkMode ? "text-stone-400" : "text-stone-500"}`}>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-7 sm:gap-2">
                {monthCells.map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className={`hidden aspect-square rounded-2xl sm:block ${isDarkMode ? "bg-stone-800" : "bg-stone-50"}`} />;
                  }

                  const dateKey = formatDateKey(date);
                  const entryCount = countsByDate[dateKey] || 0;
                  const isSelected = selectedDate && formatDateKey(selectedDate) === dateKey;
                  const isToday = formatDateKey(new Date()) === dateKey;

                  return (
                    <button
                      key={dateKey}
                      onClick={() => setSelectedDate(date)}
                      className={`min-h-[110px] rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 sm:aspect-square sm:min-h-0 sm:p-2 ${isDarkMode ? (isSelected ? "border-stone-300 bg-stone-800" : "border-stone-700 bg-stone-900 hover:bg-stone-800") : isSelected ? "border-stone-800 bg-stone-100" : "border-stone-200 bg-white"}`}
                    >
                      <div className="flex h-full flex-col justify-between gap-2 sm:gap-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-base sm:h-7 sm:w-7 sm:text-sm ${isToday ? (isDarkMode ? "bg-stone-100 text-stone-900" : "bg-stone-800 text-white") : isDarkMode ? "text-stone-200" : "text-stone-700"}`}>
                            {date.getDate()}
                          </span>
                          {entryCount > 0 && (
                            <>
                              <div className="flex items-center gap-2">
                                <span className={`rounded-full px-2 py-1 text-[10px] ${isDarkMode ? "bg-stone-200 text-stone-900" : "bg-stone-800 text-white"}`}>
                                  {entryCount}
                                </span>
                              </div>
                            </>
                          )}
                          <div className={`text-xs sm:text-[11px] ${isDarkMode ? "text-stone-400" : "text-stone-500"}`}>
                            <div className="mb-1 block text-[10px] font-medium uppercase tracking-[0.16em] sm:hidden">
                              {date.toLocaleDateString(undefined, { weekday: "short" })}
                            </div>
                            {entryCount === 0 ? "No entries" : `${entryCount} entr${entryCount === 1 ? "y" : "ies"}`}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className={`rounded-3xl border p-5 shadow-sm ${isDarkMode ? "border-stone-700 bg-stone-900" : "border-stone-300 bg-white"}`}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-serif text-2xl">
                    {selectedDate
                      ? new Date(selectedDate).toLocaleDateString(undefined, {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "All Entries"}
                  </h2>
                  <p className={`mt-1 text-sm ${isDarkMode ? "text-stone-400" : "text-stone-500"}`}>
                    {selectedDate ? "Entries for the selected date" : "Most recent journal posts"}
                  </p>
                </div>
                {session?.user && (
                  <button
                    onClick={() => openNewEntryModal(selectedDate)}
                    className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${isDarkMode ? "border-stone-700 text-stone-200 hover:bg-stone-800" : "border-stone-300 hover:bg-stone-50"}`}
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {loading ? (
                  <div className={`rounded-2xl border p-4 text-sm ${isDarkMode ? "border-stone-700 bg-stone-800 text-stone-400" : "border-stone-200 bg-stone-50 text-stone-500"}`}>Loading entries...</div>
                ) : filteredEntries.length === 0 ? (
                  <div className={`rounded-2xl border border-dashed p-6 text-sm ${isDarkMode ? "border-stone-700 bg-stone-800 text-stone-400" : "border-stone-300 bg-stone-50 text-stone-500"}`}>
                    No journal entries yet for this view.
                  </div>
                ) : (
                  filteredEntries.map((entry) => (
                    <article key={entry.id} className={`rounded-2xl border p-4 ${isDarkMode ? "border-stone-700 bg-stone-800" : "border-stone-200 bg-stone-50"}`}>
                      <div className={`mb-3 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] ${isDarkMode ? "text-stone-400" : "text-stone-500"}`}>
                        <span>{new Date(entry.occurred_at).toLocaleString()}</span>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-1 text-[10px] ${entry.visibility === "private" ? (isDarkMode ? "bg-stone-700 text-stone-200" : "bg-stone-200 text-stone-700") : (isDarkMode ? "bg-stone-100 text-stone-900" : "bg-stone-800 text-white")}`}>
                            {entry.visibility || "public"}
                          </span>
                          <EntryMenu
                            entry={entry}
                            session={session}
                            isDarkMode={isDarkMode}
                            onEdit={() => openEditEntryModal(entry)}
                            onDelete={() => handleDeleteEntry(entry)}
                            onToggleVisibility={() => handleToggleVisibility(entry)}
                          />
                        </div>
                      </div>
                      {entry.image_path && (
                        <div className="mb-4 overflow-hidden rounded-2xl border border-stone-300 bg-white">
                          <img src={getPublicDrawingUrl(entry.image_path)} alt="Journal drawing" className="h-auto w-full object-contain" />
                        </div>
                      )}
                      <div
                        className={`max-w-none text-sm ${isDarkMode ? "prose prose-invert" : "prose prose-stone"}`}
                        dangerouslySetInnerHTML={{ __html: entry.content }}
                      />
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className={`w-full max-h-[95vh] overflow-y-auto max-w-4xl rounded-3xl border p-5 shadow-2xl ${isDarkMode ? "border-stone-700 bg-stone-900" : "border-stone-300 bg-white"}`}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-serif text-2xl">{editingEntryId ? "Edit Journal Entry" : "New Journal Entry"}</h3>
                <button onClick={() => setIsModalOpen(false)} className={`rounded-full p-2 ${isDarkMode ? "hover:bg-stone-800" : "hover:bg-stone-100"}`} aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDarkMode ? "text-stone-200" : "text-stone-700"}`}>Date and time</label>
                  <input
                    type="datetime-local"
                    value={form.occurred_at}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm((prev) => ({ ...prev, occurred_at: value }));
                    }}
                    className={`w-full rounded-2xl border px-4 py-3 outline-none ${isDarkMode ? "border-stone-700 bg-stone-800 text-stone-100 focus:border-stone-300" : "border-stone-300 focus:border-stone-800"}`}
                  />
                </div>

                {session?.user && (
                  <div>
                    <label className={`mb-2 block text-sm font-medium ${isDarkMode ? "text-stone-200" : "text-stone-700"}`}>Visibility</label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, visibility: "public" }))}
                        className={`rounded-2xl border px-4 py-3 text-left text-sm ${form.visibility === "public" ? (isDarkMode ? "border-stone-200 bg-stone-100 text-stone-900" : "border-stone-800 bg-stone-800 text-white") : (isDarkMode ? "border-stone-700 bg-stone-800 text-stone-200" : "border-stone-300 bg-white text-stone-700")}`}
                      >
                        <div className="font-medium">Public</div>
                        <div className={`mt-1 text-xs ${form.visibility === "public" ? (isDarkMode ? "text-stone-700" : "text-stone-300") : (isDarkMode ? "text-stone-400" : "text-stone-500")}`}>Visible to everyone who visits the journal.</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, visibility: "private" }))}
                        className={`rounded-2xl border px-4 py-3 text-left text-sm ${form.visibility === "private" ? (isDarkMode ? "border-stone-200 bg-stone-100 text-stone-900" : "border-stone-800 bg-stone-800 text-white") : (isDarkMode ? "border-stone-700 bg-stone-800 text-stone-200" : "border-stone-300 bg-white text-stone-700")}`}
                      >
                        <div className="font-medium">Private</div>
                        <div className={`mt-1 text-xs ${form.visibility === "private" ? (isDarkMode ? "text-stone-700" : "text-stone-300") : (isDarkMode ? "text-stone-400" : "text-stone-500")}`}>Only visible while signed in as you.</div>
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className={`mb-2 block text-sm font-medium ${isDarkMode ? "text-stone-200" : "text-stone-700"}`}>Entry</label>
                  <div className={`rounded-2xl border ${isDarkMode ? "border-stone-700" : "border-stone-300"}`}>
                    <div className={`flex flex-wrap gap-2 border-b p-3 ${isDarkMode ? "border-stone-700" : "border-stone-200"}`}>
                      <button
                        type="button"
                        onClick={() => runEditorCommand("heading1")}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-sm ${editor?.isActive("heading", { level: 1 }) ? (isDarkMode ? "border-stone-200 bg-stone-100 text-stone-900" : "border-stone-800 bg-stone-800 text-white") : isDarkMode ? "border-stone-600 bg-stone-800 text-stone-100" : "border-stone-300"}`}
                      >
                        <Heading1 className="h-4 w-4" />
                        H1
                      </button>
                      <button
                        type="button"
                        onClick={() => runEditorCommand("heading2")}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-sm ${editor?.isActive("heading", { level: 2 }) ? (isDarkMode ? "border-stone-200 bg-stone-100 text-stone-900" : "border-stone-800 bg-stone-800 text-white") : isDarkMode ? "border-stone-600 bg-stone-800 text-stone-100" : "border-stone-300"}`}
                      >
                        <Heading2 className="h-4 w-4" />
                        H2
                      </button>
                      <button
                        type="button"
                        onClick={() => runEditorCommand("bold")}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-sm ${editor?.isActive("bold") ? (isDarkMode ? "border-stone-200 bg-stone-100 text-stone-900" : "border-stone-800 bg-stone-800 text-white") : isDarkMode ? "border-stone-600 bg-stone-800 text-stone-100" : "border-stone-300"}`}
                      >
                        <Bold className="h-4 w-4" />
                        Bold
                      </button>
                      <button
                        type="button"
                        onClick={() => runEditorCommand("italic")}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-sm ${editor?.isActive("italic") ? (isDarkMode ? "border-stone-200 bg-stone-100 text-stone-900" : "border-stone-800 bg-stone-800 text-white") : isDarkMode ? "border-stone-600 bg-stone-800 text-stone-100" : "border-stone-300"}`}
                      >
                        <Italic className="h-4 w-4" />
                        Italic
                      </button>
                      <button
                        type="button"
                        onClick={() => runEditorCommand("bulletList")}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-sm ${editor?.isActive("bulletList") ? (isDarkMode ? "border-stone-200 bg-stone-100 text-stone-900" : "border-stone-800 bg-stone-800 text-white") : isDarkMode ? "border-stone-600 bg-stone-800 text-stone-100" : "border-stone-300"}`}
                      >
                        <List className="h-4 w-4" />
                        Bullets
                      </button>
                      <button
                        type="button"
                        onClick={() => runEditorCommand("orderedList")}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-sm ${editor?.isActive("orderedList") ? (isDarkMode ? "border-stone-200 bg-stone-100 text-stone-900" : "border-stone-800 bg-stone-800 text-white") : isDarkMode ? "border-stone-600 bg-stone-800 text-stone-100" : "border-stone-300"}`}
                      >
                        <ListOrdered className="h-4 w-4" />
                        Numbered
                      </button>
                      <button
                        type="button"
                        onClick={() => runEditorCommand("blockquote")}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-sm ${editor?.isActive("blockquote") ? (isDarkMode ? "border-stone-200 bg-stone-100 text-stone-900" : "border-stone-800 bg-stone-800 text-white") : isDarkMode ? "border-stone-600 bg-stone-800 text-stone-100" : "border-stone-300"}`}
                      >
                        <Quote className="h-4 w-4" />
                        Quote
                      </button>
                      <button
                        type="button"
                        onClick={() => runEditorCommand("link")}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-sm ${editor?.isActive("link") ? (isDarkMode ? "border-stone-200 bg-stone-100 text-stone-900" : "border-stone-800 bg-stone-800 text-white") : isDarkMode ? "border-stone-600 bg-stone-800 text-stone-100" : "border-stone-300"}`}
                      >
                        <LinkIcon className="h-4 w-4" />
                        Link
                      </button>
                      <button
                        type="button"
                        onClick={() => runEditorCommand("undo")}
                        disabled={!editor?.can().chain().focus().undo().run()}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${isDarkMode ? "border-stone-600 bg-stone-800 text-stone-100" : "border-stone-300"}`}
                      >
                        <Undo2 className="h-4 w-4" />
                        Undo
                      </button>
                      <button
                        type="button"
                        onClick={() => runEditorCommand("redo")}
                        disabled={!editor?.can().chain().focus().redo().run()}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${isDarkMode ? "border-stone-600 bg-stone-800 text-stone-100" : "border-stone-300"}`}
                      >
                        <Redo2 className="h-4 w-4" />
                        Redo
                      </button>
                    </div>
                    <EditorContent editor={editor} />
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setIsDrawingOpen((prev) => !prev)}
                    className={`mb-2 inline-flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-medium ${isDarkMode ? "border-stone-700 bg-stone-800 text-stone-100" : "border-stone-300 bg-stone-50 text-stone-800"}`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Drawing Canvas
                    </span>
                    {isDrawingOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>

                  <div className={isDrawingOpen ? "block" : "hidden"}>
                    {editingEntryId && form.drawing_data && (
                      <div className={`mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${isDarkMode ? "border-stone-700 bg-stone-800 text-stone-200" : "border-stone-300 bg-stone-50 text-stone-700"}`}>
                        <div>
                          Current drawing attached.
                          <div className={`mt-1 text-xs ${isDarkMode ? "text-stone-400" : "text-stone-500"}`}>
                            Keep it, replace it by drawing over it, or remove it.
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, drawing_data: "" }));
                            setRemoveExistingDrawing(true);
                          }}
                          className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${isDarkMode ? "border-stone-600 bg-stone-900 text-stone-100" : "border-stone-300 bg-white text-stone-700"}`}
                        >
                          <Trash className="h-4 w-4" />
                          Remove Drawing
                        </button>
                      </div>
                    )}
                    <DrawingCanvas
                      isDarkMode={isDarkMode}
                      value={form.drawing_data}
                      onChange={(imageData) => {
                        setForm((prev) => ({ ...prev, drawing_data: imageData }));
                        setRemoveExistingDrawing(false);
                      }}
                      backgroundColor={drawingBackgroundColor}
                      onBackgroundColorChange={setDrawingBackgroundColor}
                    />
                    <p className={`mt-2 text-xs ${isDarkMode ? "text-stone-400" : "text-stone-500"}`}>
                      700×700 canvas. On smaller screens, scroll sideways inside the drawing area for a larger working surface. Use pen, marker, paint, or airbrush modes with opacity, softness, and blend controls for more realistic color layering.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={`rounded-2xl border px-4 py-3 text-sm ${isDarkMode ? "border-stone-700 text-stone-200 hover:bg-stone-800" : "border-stone-300 hover:bg-stone-50"}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium disabled:opacity-60 ${isDarkMode ? "border-stone-200 bg-stone-100 text-stone-900" : "border-stone-700 bg-stone-800 text-white"}`}
                  >
                    <Save className="h-4 w-4" />
                    {saving ? (editingEntryId ? "Saving..." : "Posting...") : (editingEntryId ? "Save Changes" : "Post")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/*
Supabase SQL for image storage and visibility:
alter table public.journal_entries
add column if not exists image_path text;

alter table public.journal_entries
add column if not exists visibility text not null default 'public';

-- Then create a public Storage bucket named journal-drawings in Supabase

Local packages:
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-link @tiptap/suggestion tippy.js
*/
