import { useState, useEffect } from 'react' // 리액트의 상태 관리를 위한 useState와 부수 효과 처리를 위한 useEffect 훅을 임포트합니다.
import './App.css' // 컴포넌트 스타일링을 위한 CSS 파일을 불러옵니다.

// 앱 초기 구동 시 사용할 기본 질문 트리 데이터 구조(정적 데이터)입니다.
const initialFlowData = {
  start: { // 초기 진입점 노드입니다.
    question: "첫 번째 선택입니다. 어디로 가시겠습니까?", // 해당 노드에서 출력할 질문 텍스트입니다.
    options: [ // 다음 노드로 이동하기 위한 선택지 배열입니다.
      { text: "선택지 1", key: "step1", alert: "", isDefault: true }, // 클릭 시 이동할 타겟 노드의 키(key) 값을 가집니다.
      { text: "선택지 2", key: "step2", alert: "", isDefault: true }
    ]
  },
};

function App() { // 최상위 App 컴포넌트 정의입니다.
  // 1. LocalStorage에서 데이터를 로드하여 초기 상태를 설정합니다. (Lazy Initializer 사용)
  // 파싱 오류 등에 대비하여 try-catch 문으로 예외 처리를 수행합니다.
  /**
   * flowData 예시: 
   * {
   *   "start": { "question": "안녕?", "options": [{ "text": "응", "key": "step1", "alert": "" }] },
   *   "step1": { "question": "반가워!", "options": [] }
   * }
   */
  const [flowData, setFlowData] = useState(() => {
    const savedData = localStorage.getItem('myQuestData');
    try {
      const parsedData = savedData ? JSON.parse(savedData) : null;
      // 저장된 데이터가 유효한 객체 형태인 경우에만 상태로 채택합니다.
      if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
        return parsedData;
      }
    } catch (e) {
      console.error("LocalStorage 데이터 파싱 중 오류 발생:", e);
    }
    return initialFlowData; // 유효한 데이터가 없으면 초기 정적 데이터를 반환합니다.
  });

  const [mode, setMode] = useState('simulate'); // 현재 뷰 모드(시뮬레이션 또는 에디터)를 관리하는 상태입니다.

  // 이동할 다음 노드가 존재하지 않을 때 표시할 에러 메시지 상태입니다.
  const [errorMsg, setErrorMsg] = useState(() => {
    const savedMsg = localStorage.getItem('myErrorMsg');
    return savedMsg !== null ? savedMsg : "연결된 질문 노드가 없습니다. 에디터에서 생성해주세요.";
  });

  /**
   * history 예시:
   * 처음 시작 시: ['start']
   * 1번 선택 후: ['start', 'step1']
   */
  const [history, setHistory] = useState(['start']);

  // 커스텀 모달의 상태를 관리합니다. (열림 여부 및 메시지)
  const [modal, setModal] = useState({ isOpen: false, message: '' });

  // useEffect를 활용하여 flowData 상태가 변경될 때마다 LocalStorage를 동기화합니다.
  useEffect(() => {
    localStorage.setItem('myQuestData', JSON.stringify(flowData));
  }, [flowData]); // 의존성 배열에 flowData를 추가하여 변경 시에만 실행되도록 합니다.

  // 에러 메시지 변경 시에도 LocalStorage에 동기화합니다.
  useEffect(() => {
    localStorage.setItem('myErrorMsg', errorMsg);
  }, [errorMsg]);

  // Editor 컴포넌트로부터 전달받은 새 데이터를 flowData 상태에 반영하는 핸들러입니다.
  const updateFlowData = (newData) => {
    setFlowData(newData);
  };

  // 시뮬레이터에서 선택지를 클릭했을 때의 비즈니스 로직을 처리합니다.
  /**
   * handleChoice 인자 예시:
   * option: { text: "1번으로 가기", key: "step1", alert: "환영합니다!" }
   * levelIndex: 0 (현재 클릭한 질문이 몇 번째 단계인지)
   */
  const handleChoice = (option, levelIndex) => {
    const hasOptionAlert = !!option.alert; // 선택지에 설정된 알림(Alert) 문구가 있는지 확인합니다.

    // 1. 알림 문구가 존재할 경우 브라우저 내장 alert를 호출합니다.
    if (hasOptionAlert) {
      setModal({ isOpen: true, message: option.alert });
    }

    // 2. 이동하고자 하는 타겟 노드가 데이터(flowData)에 존재하는지 유효성 검사를 수행합니다.
    if (!flowData[option.key]) { 
      // 타겟 노드가 없고 버튼 알림도 없었다면 설정된 에러 메시지를 출력하고 종료합니다.
      if (!hasOptionAlert) {
        setModal({ isOpen: true, message: errorMsg });
      }
      return;
    }

    // 사용자가 이전 단계의 버튼을 다시 클릭했을 경우, 클릭한 지점 이후의 기록을 제거(slice)하고 새 경로를 추가합니다.
    /**
     * slice 예시:
     * history가 ['start', 'step1', 'step3'] 일 때 index 0(start)의 버튼을 다시 누르면,
     * slice(0, 1)을 통해 ['start']만 남기고 그 뒤에 새로운 목적지인 'step2'를 붙여 ['start', 'step2'] 가 됩니다.
     */
    const newHistory = history.slice(0, levelIndex + 1);
    setHistory([...newHistory, option.key]); // 불변성을 유지하며 새 배열로 상태를 업데이트합니다.
  };

  // 시뮬레이션 기록을 초기화하여 초기 단계로 되돌립니다.
  const reset = () => {
    setHistory(['start']);
  };

  // 모든 데이터를 지우고 처음 상태로 되돌리는 함수입니다.
  const clearAllData = () => {
    // 사용자에게 정말 초기화할 것인지 한 번 더 확인합니다.
    if (window.confirm("정말 모든 데이터를 초기화하시겠습니까? 처음 상태로 돌아갑니다.")) {
      localStorage.removeItem('myQuestData'); // LocalStorage에서 질문 데이터를 삭제합니다.
      localStorage.removeItem('myErrorMsg'); // LocalStorage에서 에러 메시지를 삭제합니다.
      setFlowData(initialFlowData); // flowData 상태를 초기 데이터로 재설정합니다.
      setErrorMsg("연결된 질문 노드가 없습니다. 에디터에서 생성해주세요."); // 에러 메시지 상태도 초기값으로 재설정합니다.
      setHistory(['start']); // 시뮬레이션 기록도 초기화합니다.
      // 페이지를 새로고침하여 모든 컴포넌트 상태를 강제로 초기화할 수도 있지만,
      // 여기서는 상태를 직접 재설정하는 방식으로 처리합니다.
    }
  };

  // 모달을 닫는 함수입니다.
  const closeModal = () => {
    setModal({ ...modal, isOpen: false });
  };

  return ( // JSX 렌더링 영역입니다.
    <div className="app-container">
      <nav className="top-nav"> {/* 뷰 모드 전환을 위한 네비게이션입니다. */}
        {/* 상태 변경을 통해 조건부 렌더링을 제어합니다. */}
        <button onClick={() => setMode('simulate')} className={mode === 'simulate' ? 'active' : ''}>시뮬레이터</button>
        <button onClick={() => setMode('edit')} className={mode === 'edit' ? 'active' : ''}>질문 에디터</button>
      </nav>

      <section id="center">
        {mode === 'simulate' ? ( // 시뮬레이션 모드 렌더링
          <>
            <div className="simulator-header">
              <h1>
                당신의 선택은?
                <button className="btn-refresh" onClick={reset}>↻</button> {/* 초기화 액션 트리거 */}
              </h1>
            </div>
            <div className="simulator-content">
              <div className="flow-stack">
                {/* 1. 질문 히스토리 기록 (이미 선택된 질문과 답변들) */}
                {history.map((nodeKey, index) => {
                  const currentNode = flowData[nodeKey];
                  if (!currentNode) return null;
                  const nextSelectedKey = history[index + 1];
                  return (
                    <div key={nodeKey + index} className="flow-level">
                      <div className="question-box"><h2>{currentNode.question}</h2></div>
                      {/* 이미 선택이 완료된 이전 단계의 답변만 표시 */}
                      {nextSelectedKey && (
                        <div className="options">
                          {currentNode.options.filter(opt => opt.key === nextSelectedKey).map(opt => (
                            <button key={opt.key} className="counter selected" disabled>{opt.text}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 2. 현재 활성화된 질문의 선택지 (화면 하단에 고정) */}
              <div className="fixed-bottom-options">
                {(() => {
                  const currentKey = history[history.length - 1];
                  const currentNode = flowData[currentKey];
                  if (!currentNode) return null;
                  return (
                    <div className="options">
                      {currentNode.options.length > 0 ? (
                        currentNode.options.map((option) => (
                          <button
                            key={option.key}
                            className="counter"
                            onClick={() => handleChoice(option, history.length - 1)}
                          >
                            {option.text}
                          </button>
                        ))
                      ) : <button className="counter reset" onClick={reset}>다시 시작하기</button>}
                    </div>
                  );
                })()}
              </div>
            </div>
          </>
        ) : ( // 에디터 모드 렌더링
          <Editor
            data={flowData}
            onUpdate={updateFlowData} // 상위 컴포넌트의 상태를 변경하기 위해 핸들러를 Props로 전달합니다.
            errorMsg={errorMsg}
            onErrorMsgUpdate={setErrorMsg}
            onResetAll={clearAllData} // 전체 초기화 함수를 Props로 전달합니다.
            initialFlowData={initialFlowData} // Editor 컴포넌트에 initialFlowData를 전달합니다.
          />
        )}
      </section>

      {/* 커스텀 모달 레이어 팝업 */}
      {modal.isOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <p>{modal.message}</p>
            <button className="modal-btn" onClick={closeModal}>확인</button>
          </div>
        </div>
      )}
    </div>
  )
}
 
/**
 * 에디터 뷰를 담당하는 서브 컴포넌트입니다.
 * Props를 통해 부모로부터 데이터와 상태 변경 함수를 주입받습니다.
 */
function Editor({ data, onUpdate, errorMsg, onErrorMsgUpdate, onResetAll, initialFlowData }) {
  const [draggedIndex, setDraggedIndex] = useState(null); // 드래그 중인 노드의 인덱스
  const [showTreeView, setShowTreeView] = useState(false); // 트리 뷰 모달 상태

  // 새로운 질문 노드를 생성하고 전체 데이터 객체에 추가합니다.
  const addNode = (key, initialQuestion = "새 질문을 입력하세요") => {
    if (!key || data[key]) return alert("유효하지 않거나 중복된 키입니다.");

    // 중복되지 않는 다음 일련번호를 계산하여 기본 선택지 2개를 생성합니다.
    const allKeys = new Set(Object.keys(data));
    Object.values(data).forEach(node => {
      node.options.forEach(opt => allKeys.add(opt.key));
    });

    let maxNum = 0;
    allKeys.forEach(k => {
      const match = k.match(/^step(\d+)$/);
      if (match) maxNum = Math.max(maxNum, parseInt(match[1]));
    });

    const defaultOptions = [
      { text: "선택지 1", key: `step${maxNum + 1}`, alert: "", isDefault: true },
      { text: "선택지 2", key: `step${maxNum + 2}`, alert: "", isDefault: true }
    ];

    onUpdate({ 
      ...data, 
      [key]: { question: initialQuestion, options: defaultOptions } 
    });
  };

  // 특정 노드를 삭제합니다. 'start' 노드는 서비스 무결성을 위해 삭제를 금지합니다.
  const deleteNode = (key) => {
    if (key === 'start') return alert("시작 노드(start)는 삭제할 수 없어요!");
    const newData = { ...data };
    delete newData[key];
    onUpdate(newData);
  };

  // 노드의 질문 텍스트를 업데이트합니다.
  const updateNodeQuestion = (key, text) => {
    onUpdate({ ...data, [key]: { ...data[key], question: text } });
  };

  // 특정 노드에 새로운 선택지(Option)를 추가합니다. 
  // 기존에 존재하는 키값들을 분석하여 자동으로 'stepN' 형태의 다음 키값을 제안합니다.
  /**
   * addOption 로직 예시:
   * 현재 등록된 모든 키가 ['start', 'step1', 'step2'] 라면,
   * maxNum은 2가 되고, 새로 만들어질 키는 'step3'이 됩니다.
   */
  const addOption = (key) => {
    // 전체 노드 및 옵션 키를 추출하여 중복되지 않는 다음 일련번호를 계산합니다.
    const allKeysInFlowData = new Set(Object.keys(data));
    Object.values(data).forEach(node => {
      node.options.forEach(option => {
        allKeysInFlowData.add(option.key);
      });
    });

    let maxNum = 0;
    allKeysInFlowData.forEach(k => {
      const match = k.match(/^step(\d+)$/);
      if (match && !isNaN(parseInt(match[1]))) {
        maxNum = Math.max(maxNum, parseInt(match[1]));
      }
    });
    
    const newOption = { text: "새 선택지", key: `step${maxNum + 1}`, alert: "", isDefault: true };
    onUpdate({ ...data, [key]: { ...data[key], options: [...data[key].options, newOption] } });
  };

  // 특정 노드 내의 옵션 정보를 수정합니다. (텍스트, 이동 키값, 알림 메시지 등)
  const updateOption = (nodeKey, optIndex, field, value) => {
    const newOptions = [...data[nodeKey].options];
    const updatedOption = { ...newOptions[optIndex], [field]: value };
    // 텍스트 필드가 변경되면, 더 이상 기본값이 아니라고 표시합니다.
    if (field === 'text') {
      updatedOption.isDefault = false;
    }
    newOptions[optIndex] = updatedOption;
    onUpdate({ ...data, [nodeKey]: { ...data[nodeKey], options: newOptions } });
  };

  // 특정 노드 내의 옵션을 삭제합니다. 'start' 노드의 기본 옵션(step1, step2)은 보호합니다.
  const deleteOption = (nodeKey, optIndex) => {
    const option = data[nodeKey].options[optIndex];
    if (nodeKey === 'start' && (option.key === 'step1' || option.key === 'step2')) {
      return alert("시작 방의 step1과 step2는 지울 수 없어요!");
    }
    const newOptions = data[nodeKey].options.filter((_, i) => i !== optIndex);
    onUpdate({ ...data, [nodeKey]: { ...data[nodeKey], options: newOptions } });
  };

  // 특정 노드(ID)를 목적지로 가지고 있는 부모 노드의 선택지 텍스트를 찾아 반환합니다.
  // 이를 통해 ID 옆의 텍스트가 질문 내용이 아닌 '이전 선택지'의 내용과 실시간으로 연동됩니다.
  const getSourceChoiceText = (targetKey) => {
    for (const nodeKey in data) {
      const foundOpt = data[nodeKey].options.find(opt => opt.key === targetKey);
      if (foundOpt) return foundOpt.text;
    }
    return ""; // 연결된 부모가 없는 경우(예: start) 빈 문자열을 반환합니다.
  };

  // 노드의 순서를 변경하는 함수입니다.
  const moveNode = (fromIndex, toIndex) => {
    const keys = Object.keys(data);
    const newKeys = [...keys];
    const [movedKey] = newKeys.splice(fromIndex, 1);
    newKeys.splice(toIndex, 0, movedKey);

    // 새로운 순서로 객체를 재구성합니다. 
    // JS 객체는 삽입 순서를 유지하므로 이 방식으로 순서 저장이 가능합니다.
    const newData = {};
    newKeys.forEach(key => {
      newData[key] = data[key];
    });
    
    onUpdate(newData); // 상위 App의 flowData와 localStorage가 자동 업데이트됩니다.
  };

  // 트리 구조를 재귀적으로 렌더링하는 함수입니다.
  const renderTree = (nodeKey, visited = new Set()) => {
    const node = data[nodeKey];
    if (!node) return <li className="tree-item"><span className="tree-node-id">{nodeKey}</span> (연결된 노드 없음)</li>;

    // 무한 루프(순환 참조) 방지
    if (visited.has(nodeKey)) {
      return <li className="tree-item"><span className="tree-node-id">{nodeKey}</span> (이미 위에서 언급됨)</li>;
    }
    visited.add(nodeKey);

    return (
      <li key={nodeKey} className="tree-item">
        <span className="tree-node-id">{nodeKey}</span>
        <span className="tree-node-q">{node.question}</span>
        {node.options.length > 0 && (
          <ul className="tree-list">
            {node.options.map((opt, i) => renderTree(opt.key, new Set(visited)))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="editor-view">
      <div className="editor-header">
        <h1>
          질문 에디터
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="btn-refresh" onClick={() => setShowTreeView(true)} title="전체 트리 보기" style={{fontSize: '0.8rem', padding: '5px 10px'}}>전체 구조 보기</button>
            <button className="btn-refresh" onClick={onResetAll}>↻</button>
          </div>
        </h1>
      </div>
        
      <div className="node-list">
        {Object.keys(data).map((key, index) => (
          <div 
            key={key} 
            className={`editor-node ${draggedIndex === index ? 'dragging' : ''}`}
            onDragOver={(e) => e.preventDefault()} // 드롭 허용
            onDrop={() => {
              if (draggedIndex !== null && draggedIndex !== index) {
                moveNode(draggedIndex, index);
              }
              setDraggedIndex(null);
            }}
          >
            <div className="node-header">
              <strong 
                draggable
                onDragStart={() => setDraggedIndex(index)}
                onDragEnd={() => setDraggedIndex(null)}
                onClick={() => addNode(key)} 
                title="드래그하여 순서 변경 / 클릭하여 ID 복사"
              >
                ID: {key} ({getSourceChoiceText(key)})
              </strong>
              {key !== 'start' && <button onClick={() => deleteNode(key)} className="btn-del">삭제</button>}
            </div>
            <textarea className="edit-q" value={data[key].question} onChange={(e) => updateNodeQuestion(key, e.target.value)} rows={3} />
            <div className="edit-options">
              {data[key].options.map((opt, i) => (
                <div key={i} className="opt-row">
                  <span 
                    className="opt-key-link"
                    onClick={() => {
                      // 현재 입력창에 적힌 버튼 텍스트를 새 질문의 제목으로 사용하여 생성합니다.
                      addNode(opt.key, opt.text);
                    }}
                    title="클릭하여 새 질문 방 만들기"
                  >{opt.key}</span>
                  <input 
                    placeholder={opt.isDefault ? opt.text : "버튼 텍스트"} // isDefault가 true면 opt.text를 placeholder로 사용
                    value={opt.isDefault ? "" : opt.text} // isDefault가 true면 value를 비워 플레이스홀더처럼 보이게 함
                    onChange={(e) => updateOption(key, i, 'text', e.target.value)} 
                  />
                  <input 
                    placeholder="선택 시 알림 (옵션)" 
                    value={opt.alert || ''} 
                    onChange={(e) => updateOption(key, i, 'alert', e.target.value)} 
                  />
                  <button 
                    className="btn-del-opt" 
                    onClick={() => deleteOption(key, i)} 
                    title="선택지 삭제"
                    style={{ 
                      visibility: (key === 'start' && (opt.key === 'step1' || opt.key === 'step2')) ? 'hidden' : 'visible',
                      pointerEvents: (key === 'start' && (opt.key === 'step1' || opt.key === 'step2')) ? 'none' : 'auto'
                    }}
                  >X</button>
                </div>
              ))}
              <button className="btn-add-opt" onClick={() => addOption(key)}>+ 선택지 추가</button>
            </div>
          </div>
        ))}
      </div>

      <div className="global-settings">
        <label>노드 부재 시 경고 문구</label>
        <input value={errorMsg} onChange={(e) => onErrorMsgUpdate(e.target.value)} placeholder="경고 문구를 입력하세요" />
      </div>

      {/* 전체 트리 구조 레이어 */}
      {showTreeView && (
        <div className="tree-view-overlay" onClick={() => setShowTreeView(false)}>
          <div className="tree-view-content" onClick={(e) => e.stopPropagation()}>
            <h2>프로세스 전체 구조</h2>
            <ul className="tree-list" style={{border: 'none'}}>
              {renderTree('start')}
            </ul>
            <button className="btn-close-tree" onClick={() => setShowTreeView(false)}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App
