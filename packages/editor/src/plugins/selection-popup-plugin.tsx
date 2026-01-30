import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_LOW,
} from 'lexical';
import { createPortal } from 'react-dom';

export interface SelectionInfo {
  text: string;
  start: number;
  end: number;
  rect: DOMRect;
}

export interface SelectionPopupPluginProps {
  onSelectionChange?: (selection: SelectionInfo | null) => void;
  renderPopup?: (props: {
    selection: SelectionInfo;
    onClose: () => void;
    replaceSelection: (newText: string) => void;
  }) => React.ReactNode;
}

/**
 * SelectionPopupPlugin detects text selection and can render a floating popup
 */
export function SelectionPopupPlugin({
  onSelectionChange,
  renderPopup,
}: SelectionPopupPluginProps): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [selectionInfo, setSelectionInfo] = useState<SelectionInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const updateSelection = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();

      if (!$isRangeSelection(selection) || selection.isCollapsed()) {
        setSelectionInfo(null);
        setIsVisible(false);
        onSelectionChange?.(null);
        return;
      }

      const text = selection.getTextContent();
      if (!text || text.trim().length === 0) {
        setSelectionInfo(null);
        setIsVisible(false);
        onSelectionChange?.(null);
        return;
      }

      // Get the DOM selection to position the popup
      const nativeSelection = window.getSelection();
      if (!nativeSelection || nativeSelection.rangeCount === 0) {
        return;
      }

      const range = nativeSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      const anchor = selection.anchor;
      const focus = selection.focus;
      const start = Math.min(anchor.offset, focus.offset);
      const end = Math.max(anchor.offset, focus.offset);

      const info: SelectionInfo = {
        text,
        start,
        end,
        rect,
      };

      setSelectionInfo(info);
      setIsVisible(true);
      onSelectionChange?.(info);
    });
  }, [editor, onSelectionChange]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setSelectionInfo(null);
  }, []);

  // Replace the current selection with new text
  const replaceSelection = useCallback((newText: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        // Delete the selected content and insert new text
        selection.insertText(newText);
      }
    });
    handleClose();
  }, [editor, handleClose]);

  useEffect(() => {
    // Listen for selection changes
    const removeListener = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        // Delay to ensure selection is updated
        requestAnimationFrame(updateSelection);
        return false;
      },
      COMMAND_PRIORITY_LOW
    );

    // Also listen for mouseup to catch selection via mouse
    const handleMouseUp = () => {
      setTimeout(updateSelection, 10);
    };

    // Listen for keyup to catch selection via keyboard (shift+arrow keys)
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.shiftKey) {
        setTimeout(updateSelection, 10);
      }
    };

    // Hide popup when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        // Check if click is within the editor
        const editorRoot = editor.getRootElement();
        if (editorRoot && !editorRoot.contains(e.target as Node)) {
          handleClose();
        }
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      removeListener();
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editor, updateSelection, handleClose]);

  // Don't render if no selection or no renderPopup function
  if (!isVisible || !selectionInfo || !renderPopup) {
    return null;
  }

  // Calculate popup position (above the selection)
  const popupStyle: React.CSSProperties = {
    position: 'fixed',
    top: selectionInfo.rect.top - 8,
    left: selectionInfo.rect.left + selectionInfo.rect.width / 2,
    transform: 'translate(-50%, -100%)',
    zIndex: 1000,
  };

  return createPortal(
    <div ref={popupRef} style={popupStyle}>
      {renderPopup({ selection: selectionInfo, onClose: handleClose, replaceSelection })}
    </div>,
    document.body
  );
}
