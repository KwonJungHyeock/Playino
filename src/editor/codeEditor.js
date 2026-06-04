// codeEditor.js — CodeMirror 6 (Arduino C++ 하이라이트)
import { EditorView, basicSetup } from 'codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';

/**
 * parent 안에 에디터를 생성한다.
 * @returns {{ view, getDoc:()=>string, setDoc:(s:string)=>void, destroy:()=>void }}
 */
export function createEditor(parent, doc = '') {
  const view = new EditorView({
    doc,
    extensions: [basicSetup, cpp(), oneDark, EditorView.lineWrapping],
    parent,
  });
  return {
    view,
    getDoc: () => view.state.doc.toString(),
    setDoc: (s) => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: s } }),
    destroy: () => view.destroy(),
  };
}
