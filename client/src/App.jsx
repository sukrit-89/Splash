import { useState, useEffect, useRef } from 'react';
import './App.css';
import Editor from '@monaco-editor/react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { 
  Code2,
  Rocket,
  Zap,
  History,
  Bot,
  Lightbulb,
  Bug,
  Sparkles,
  Settings,
  ArrowRight,
  ArrowLeft,
  X,
  Coins,
  Image,
  Package,
  BookOpen,
  Target,
  Link
} from 'lucide-react';
import { 
  connectWallet, 
  WalletErrorType,
  getConnectedPublicKey,
  checkConnection,
  signTransaction as signTxnWallet
} from './wallet';
import { getExamplesList, getExample } from './contracts/examples';
import * as AI from './ai';
import * as Compiler from './compiler';
import { deployContract, invokeContract, getExplorerUrl } from './deploy';
import Landing from './Landing';

function App() {
  // App state
  const [showLanding, setShowLanding] = useState(true);

  // Render landing page or IDE
  if (showLanding) {
    return <Landing onEnterIDE={() => setShowLanding(false)} />;
  }

  return <IDE onBackToLanding={() => setShowLanding(true)} />;
}

function IDE({ onBackToLanding }) {
  // Wallet state
  const [publicKey, setPublicKey] = useState('');
  const [loading, setLoading] = useState(false);

  // Editor state
  const [selectedExample, setSelectedExample] = useState('counter');
  const [code, setCode] = useState('');
  const [activePanel, setActivePanel] = useState('editor'); // 'editor' | 'deploy' | 'interact'

  // Contract state
  const [deployedContract, setDeployedContract] = useState(null);
  const [deployStatus, setDeployStatus] = useState(null);
  const [transactions, setTransactions] = useState([]);

  // Interaction state
  const [selectedFunction, setSelectedFunction] = useState(null);
  const [functionParams, setFunctionParams] = useState({});
  const [callResult, setCallResult] = useState(null);

  // AI state
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAction, setAiAction] = useState(null); // null | 'explain' | 'debug' | 'improve'
  const [completionSuggestion, setCompletionSuggestion] = useState(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  // Check for existing wallet connection on mount
  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        const connected = await checkConnection();
        if (connected) {
          const key = getConnectedPublicKey();
          if (key) {
            setPublicKey(key);
            console.log('Wallet reconnected:', key);
          }
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    };
    
    checkWalletConnection();
  }, []);

  // Load initial example on mount
  useEffect(() => {
    const example = getExample(selectedExample);
    if (example && example.code) {
      setCode(example.code);
    }
  }, [selectedExample]);

  const handleConnect = async () => {
    try {
      setLoading(true);
      const key = await connectWallet();
      setPublicKey(key);
    } catch (error) {
      console.error('Connect error:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExampleChange = (exampleId) => {
    setSelectedExample(exampleId);
    const example = getExample(exampleId);
    if (example && example.code) {
      setCode(example.code);
    }
    setSelectedFunction(null);
    setCallResult(null);
  };

  const handleDeploy = async () => {
    if (!publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setLoading(true);
      setDeployStatus({ status: 'pending', message: 'Compiling contract...' });

      // Step 1: Compile Rust to WASM
      console.log('Compiling contract:', selectedExample || 'custom');
      const compilationResult = await Compiler.compileContract(code, selectedExample);
      
      if (compilationResult.status !== Compiler.CompilationStatus.SUCCESS) {
        throw new Error(compilationResult.error || 'Compilation failed');
      }

      if (!compilationResult.wasm) {
        // If no pre-compiled WASM available, show helpful message
        setDeployStatus({
          status: 'error',
          message: 'Pre-compiled WASM not available for this contract. To deploy custom contracts:\n\n' +
                   '1. Set up the backend compiler service, or\n' +
                   '2. Use stellar-cli locally to compile and deploy\n' +
                   '3. For now, please use the example contracts'
        });
        setLoading(false);
        return;
      }

      setDeployStatus({ status: 'pending', message: 'Uploading WASM to network...' });
      
      // Step 2: Deploy contract to Stellar
      console.log('Deploying contract to Stellar Testnet...');
      const deployResult = await deployContract(compilationResult.wasm, publicKey);
      
      const example = selectedExample ? getExample(selectedExample) : null;
      const contractName = (example && example.name) ? example.name : 'AI Generated Contract';
      
      setDeployedContract({
        id: deployResult.contractId,
        name: contractName,
        deployedAt: new Date().toISOString(),
        wasmHash: deployResult.wasmHash
      });

      setDeployStatus({
        status: 'success',
        message: 'Contract deployed successfully!',
        contractId: deployResult.contractId
      });

      setTransactions([{
        type: 'deploy',
        contractId: deployResult.contractId,
        timestamp: new Date().toISOString(),
        hash: deployResult.deployTxHash,
        explorerUrl: getExplorerUrl(deployResult.deployTxHash)
      }, ...transactions]);

      setActivePanel('interact');
    } catch (error) {
      setDeployStatus({
        status: 'error',
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCallFunction = async () => {
    if (!selectedFunction) return;
    
    if (!deployedContract) {
      alert('Please deploy a contract first');
      return;
    }

    try {
      setLoading(true);
      setCallResult({ status: 'pending', message: 'Calling function...' });

      // Prepare function arguments (convert from functionParams)
      const args = prepareFunctionArgs(selectedFunction, functionParams);
      
      console.log('Invoking contract function:', selectedFunction.name, 'with args:', args);
      
      // Call the contract on-chain
      const result = await invokeContract(
        deployedContract.id,
        selectedFunction.name,
        args,
        publicKey
      );
      
      setCallResult({
        status: 'success',
        result: JSON.stringify(result.result, null, 2)
      });

      setTransactions([{
        type: 'invoke',
        function: selectedFunction.name,
        params: functionParams,
        result: result.result,
        timestamp: new Date().toISOString(),
        hash: result.transactionHash,
        explorerUrl: getExplorerUrl(result.transactionHash)
      }, ...transactions]);

    } catch (error) {
      setCallResult({
        status: 'error',
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper: Prepare function arguments for Soroban contract calls
  const prepareFunctionArgs = (func, params) => {
    // Convert parameters to Soroban ScVal format
    const args = [];
    
    if (func.params && func.params.length > 0) {
      func.params.forEach(param => {
        const value = params[param.name];
        
        if (value !== undefined && value !== '') {
          // Convert based on type
          if (param.type === 'i32' || param.type === 'u32') {
            args.push(StellarSdk.nativeToScVal(parseInt(value), { type: param.type }));
          } else if (param.type === 'String') {
            args.push(StellarSdk.nativeToScVal(value, { type: 'string' }));
          } else if (param.type === 'Address') {
            args.push(new StellarSdk.Address(value).toScVal());
          } else {
            // Default: try to convert as-is
            args.push(StellarSdk.nativeToScVal(value));
          }
        }
      });
    }
    
    return args;
  };

  // AI Functions
  useEffect(() => {
    const savedKey = AI.getApiKey();
    setApiKey(savedKey);
  }, []);

  const handleSaveApiKey = () => {
    AI.setApiKey(apiKey);
    setShowApiKeyModal(false);
    if (aiChatMessages.length === 0) {
      setAiChatMessages([{
        role: 'assistant',
        content: '👋 Hi! I\'m your AI coding assistant. I can help you:\n\n• Answer questions about Soroban & Rust\n• Generate smart contracts from descriptions\n• Explain code in simple terms\n• Debug and fix issues\n• Suggest improvements\n\nWhat would you like to build today?'
      }]);
    }
  };

  const handleAiChat = async () => {
    if (!aiInput.trim()) return;
    if (!AI.isConfigured()) {
      setShowApiKeyModal(true);
      return;
    }

    const userMessage = aiInput.trim();
    setAiInput('');
    
    const newMessages = [...aiChatMessages, { role: 'user', content: userMessage }];
    setAiChatMessages(newMessages);
    setAiLoading(true);

    try {
      const conversationHistory = newMessages.slice(-10); // Keep last 10 messages
      const response = await AI.chatWithAI(userMessage, conversationHistory);
      
      setAiChatMessages([...newMessages, { role: 'assistant', content: response }]);
    } catch (error) {
      setAiChatMessages([...newMessages, { 
        role: 'assistant', 
        content: `❌ Error: ${error.message}` 
      }]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleExplainCode = async () => {
    if (!AI.isConfigured()) {
      setShowApiKeyModal(true);
      return;
    }

    const selectedText = editorRef.current?.getSelection();
    const selectedCode = selectedText ? editorRef.current.getModel().getValueInRange(selectedText) : null;
    const codeToExplain = selectedCode || code;

    setAiAction('explain');
    setAiLoading(true);
    setActivePanel('ai');

    try {
      const explanation = await AI.explainCode(codeToExplain, selectedCode ? 'selected code' : null);
      setAiChatMessages([...aiChatMessages, 
        { role: 'user', content: `Explain this code:\n\`\`\`rust\n${codeToExplain.substring(0, 200)}${codeToExplain.length > 200 ? '...' : ''}\n\`\`\`` },
        { role: 'assistant', content: explanation }
      ]);
    } catch (error) {
      setAiChatMessages([...aiChatMessages, { 
        role: 'assistant', 
        content: `❌ Error: ${error.message}` 
      }]);
    } finally {
      setAiLoading(false);
      setAiAction(null);
    }
  };

  const handleDebugCode = async () => {
    if (!AI.isConfigured()) {
      setShowApiKeyModal(true);
      return;
    }

    setAiAction('debug');
    setAiLoading(true);
    setActivePanel('ai');

    try {
      const debugInfo = await AI.debugCode(code);
      setAiChatMessages([...aiChatMessages, 
        { role: 'user', content: 'Debug this contract and find potential issues' },
        { role: 'assistant', content: debugInfo }
      ]);
    } catch (error) {
      setAiChatMessages([...aiChatMessages, { 
        role: 'assistant', 
        content: `❌ Error: ${error.message}` 
      }]);
    } finally {
      setAiLoading(false);
      setAiAction(null);
    }
  };

  const handleImproveCode = async () => {
    if (!AI.isConfigured()) {
      setShowApiKeyModal(true);
      return;
    }

    setAiAction('improve');
    setAiLoading(true);
    setActivePanel('ai');

    try {
      const improvements = await AI.improveCode(code);
      setAiChatMessages([...aiChatMessages, 
        { role: 'user', content: 'Review and suggest improvements for this contract' },
        { role: 'assistant', content: improvements }
      ]);
    } catch (error) {
      setAiChatMessages([...aiChatMessages, { 
        role: 'assistant', 
        content: `❌ Error: ${error.message}` 
      }]);
    } finally {
      setAiLoading(false);
      setAiAction(null);
    }
  };

  const handleGenerateContract = async (description) => {
    if (!AI.isConfigured()) {
      setShowApiKeyModal(true);
      return;
    }

    setAiLoading(true);
    setActivePanel('ai');

    try {
      const newContract = await AI.generateContract(description);
      setCode(newContract);
      setSelectedExample(null); // Clear selected example for AI-generated code
      setAiChatMessages([...aiChatMessages, 
        { role: 'user', content: `Generate a contract: ${description}` },
        { role: 'assistant', content: `✅ Contract generated! I've loaded it into the editor. Here's what I created:\n\n${newContract}` }
      ]);
      setActivePanel('editor');
    } catch (error) {
      setAiChatMessages([...aiChatMessages, { 
        role: 'assistant', 
        content: `❌ Error: ${error.message}` 
      }]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Add inline completion provider
    monaco.languages.registerInlineCompletionsProvider('rust', {
      provideInlineCompletions: async (model, position, context, token) => {
        if (!AI.isConfigured()) return { items: [] };

        try {
          const codeBefore = model.getValueInRange({
            startLineNumber: Math.max(1, position.lineNumber - 10),
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          });

          const codeAfter = model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: Math.min(model.getLineCount(), position.lineNumber + 3),
            endColumn: model.getLineMaxColumn(Math.min(model.getLineCount(), position.lineNumber + 3)),
          });

          const completion = await AI.completeCode(codeBefore, codeAfter);
          
          return {
            items: [{
              insertText: completion,
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              },
            }],
          };
        } catch (error) {
          return { items: [] };
        }
      },
      freeInlineCompletions: () => {},
    });
  };

  const examples = getExamplesList();
  const currentExample = selectedExample ? getExample(selectedExample) : null;

  return (
    <div className="ide-app">
      <div className="grain-overlay"></div>

      {/* IDE Header */}
      <header className="ide-header">
        <div className="brand">
          <div className="brand-icon">
            <img src="/Orbital-IDE.png" alt="Orbital IDE" />
          </div>
          <h1 className="brand-title">
            <span className="brand-name">Orbital</span>
            <span className="brand-type">IDE</span>
          </h1>
        </div>

        <div className="header-actions">
          <div className="network-badge">TESTNET</div>
          {!publicKey ? (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          ) : (
            <div className="connected-info">
              <code className="connected-key">{publicKey.slice(0, 4)}...{publicKey.slice(-4)}</code>
              <div className="status-dot"></div>
            </div>
          )}
        </div>
      </header>

      {/* IDE Layout */}
      <div className="ide-layout">
        {/* Sidebar */}
        <aside className="ide-sidebar">
          <div className="sidebar-section">
            <h3 className="sidebar-title">Contract Examples</h3>
            <div className="example-list">
              {examples.map(example => (
                <button
                  key={example.id}
                  onClick={() => handleExampleChange(example.id)}
                  className={`example-item ${selectedExample === example.id ? 'active' : ''}`}
                >
                  <div className="example-name">{example.name}</div>
                  <div className="example-desc">{example.description}</div>
                  <div className={`difficulty difficulty-${example.difficulty.toLowerCase()}`}>
                    {example.difficulty}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {deployedContract && (
            <div className="sidebar-section">
              <h3 className="sidebar-title">Deployed Contract</h3>
              <div className="deployed-contract">
                <div className="contract-name">{deployedContract.name}</div>
                <code className="contract-id">{deployedContract.id}</code>
                <a
                  href={`https://stellar.expert/explorer/testnet/contract/${deployedContract.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-small"
                >
                  View on Explorer →
                </a>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="ide-main">
          {/* Panel Tabs */}
          <div className="panel-tabs">
            <button
              onClick={() => setActivePanel('editor')}
              className={`panel-tab ${activePanel === 'editor' ? 'active' : ''}`}
            >
              <Code2 size={16} /> Editor
            </button>
            <button
              onClick={() => setActivePanel('ai')}
              className={`panel-tab ${activePanel === 'ai' ? 'active' : ''}`}
              title="AI Coding Assistant"
            >
              <Bot size={16} /> AI Assistant
            </button>
            <button
              onClick={() => setActivePanel('deploy')}
              className={`panel-tab ${activePanel === 'deploy' ? 'active' : ''}`}
            >
              <Rocket size={16} /> Deploy
            </button>
            <button
              onClick={() => setActivePanel('interact')}
              className={`panel-tab ${activePanel === 'interact' ? 'active' : ''}`}
              disabled={!deployedContract}
            >
              <Zap size={16} /> Interact
            </button>
            <button
              onClick={() => setActivePanel('transactions')}
              className={`panel-tab ${activePanel === 'transactions' ? 'active' : ''}`}
            >
              <History size={16} /> History
            </button>
          </div>

          {/* Editor Panel */}
          {activePanel === 'editor' && (
            <div className="panel-content">
              <div className="editor-header">
                <h2 className="panel-title">
                  {currentExample ? currentExample.name : (
                    <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <Bot size={20} /> AI Generated Contract
                    </span>
                  )}
                </h2>
                <p className="panel-desc">
                  {currentExample ? currentExample.description : 'Custom contract generated by AI Assistant'}
                </p>
              </div>
              <div className="editor-container">
                <Editor
                  height="60vh"
                  defaultLanguage="rust"
                  value={code}
                  onChange={(value) => setCode(value)}
                  onMount={handleEditorMount}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    readOnly: false,
                    automaticLayout: true,
                    inlineSuggest: { enabled: true },
                    quickSuggestions: false,
                  }}
                />
              </div>
              <div className="editor-footer">
                <div className="editor-actions">
                  {!currentExample && (
                    <button
                      onClick={() => handleExampleChange('counter')}
                      className="btn btn-ghost btn-small"
                      title="Back to example contracts"
                    >
                      ← Examples
                    </button>
                  )}
                  <button
                    onClick={handleExplainCode}
                    className="btn btn-ghost btn-small"
                    disabled={aiLoading}
                    title="AI explain selected code or entire contract"
                  >
                    <Lightbulb size={14} /> Explain
                  </button>
                  <button
                    onClick={handleDebugCode}
                    className="btn btn-ghost btn-small"
                    disabled={aiLoading}
                    title="AI find and fix issues"
                  >
                    <Bug size={14} /> Debug
                  </button>
                  <button
                    onClick={handleImproveCode}
                    className="btn btn-ghost btn-small"
                    disabled={aiLoading}
                    title="AI suggest improvements"
                  >
                    <Sparkles size={14} /> Improve
                  </button>
                </div>
                <button
                  onClick={() => setActivePanel('deploy')}
                  className="btn btn-primary"
                >
                  Deploy Contract →
                </button>
              </div>
            </div>
          )}

          {/* AI Assistant Panel */}
          {activePanel === 'ai' && (
            <div className="panel-content ai-panel">
              <div className="ai-header">
                <h2 className="panel-title" style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <Bot size={24} /> AI Coding Assistant
                </h2>
                <button
                  onClick={() => setShowApiKeyModal(true)}
                  className="btn btn-ghost btn-small"
                  title="Configure AI settings"
                >
                  <Settings size={14} /> {AI.isConfigured() ? 'API Key Set' : 'Set API Key'}
                </button>
              </div>

              <div className="ai-chat-container">
                <div className="ai-messages">
                  {aiChatMessages.length === 0 && !AI.isConfigured() && (
                    <div className="ai-welcome">
                      <h3 style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px'}}>
                        Welcome to AI Assistant! <Rocket size={24} />
                      </h3>
                      <p>Set your Groq API key to get started.</p>
                      <button
                        onClick={() => setShowApiKeyModal(true)}
                        className="btn btn-primary"
                      >
                        Configure API Key
                      </button>
                      <p className="ai-info">
                        Get a free API key at <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer">console.groq.com</a>
                      </p>
                    </div>
                  )}
                  
                  {aiChatMessages.map((msg, idx) => (
                    <div key={idx} className={`ai-message ai-message-${msg.role}`}>
                      <div className="ai-message-avatar">
                        {msg.role === 'user' ? '👤' : <Bot size={20} />}
                      </div>
                      <div className="ai-message-content">
                        <pre className="ai-message-text">{msg.content}</pre>
                      </div>
                    </div>
                  ))}

                  {aiLoading && (
                    <div className="ai-message ai-message-assistant">
                      <div className="ai-message-avatar"><Bot size={20} /></div>
                      <div className="ai-message-content">
                        <div className="ai-loading">Thinking...</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="ai-input-container">
                  <div className="ai-quick-actions">
                    <button
                      onClick={() => {
                        setAiInput('How do I create a token contract in Soroban?');
                      }}
                      className="quick-action"
                      disabled={aiLoading || !AI.isConfigured()}
                    >
                      <Coins size={14} /> Token Contract
                    </button>
                    <button
                      onClick={() => {
                        setAiInput('Generate a simple NFT contract with mint and transfer functions');
                        setTimeout(() => {
                          const desc = 'a simple NFT contract with mint and transfer functions';
                          handleGenerateContract(desc);
                        }, 100);
                      }}
                      className="quick-action"
                      disabled={aiLoading || !AI.isConfigured()}
                    >
                      <Image size={14} /> NFT Contract
                    </button>
                    <button
                      onClick={() => {
                        setAiInput('What are Soroban storage best practices?');
                      }}
                      className="quick-action"
                      disabled={aiLoading || !AI.isConfigured()}
                    >
                      <Package size={14} /> Storage Tips
                    </button>
                  </div>

                  <div className="ai-input-box">
                    <textarea
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAiChat();
                        }
                      }}
                      placeholder={AI.isConfigured() ? "Ask me anything about Soroban contracts..." : "Configure API key first..."}
                      className="ai-textarea"
                      disabled={!AI.isConfigured() || aiLoading}
                      rows="3"
                    />
                    <button
                      onClick={handleAiChat}
                      disabled={!aiInput.trim() || aiLoading || !AI.isConfigured()}
                      className="btn btn-primary ai-send-btn"
                    >
                      Send ↗
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Deploy Panel */}
          {activePanel === 'deploy' && (
            <div className="panel-content">
              <h2 className="panel-title">Deploy Contract</h2>
              
              <div className="deploy-info">
                <div className="info-row">
                  <label>Contract:</label>
                  <span>{currentExample ? currentExample.name : 'AI Generated Contract'}</span>
                </div>
                <div className="info-row">
                  <label>Network:</label>
                  <span>Stellar Testnet</span>
                </div>
                {publicKey && (
                  <div className="info-row">
                    <label>Deployer:</label>
                    <code>{publicKey.slice(0, 8)}...{publicKey.slice(-8)}</code>
                  </div>
                )}
              </div>

              <div className="deploy-actions">
                <button
                  onClick={handleDeploy}
                  disabled={loading || !publicKey}
                  className="btn btn-primary btn-large"
                >
                  {loading ? 'Deploying...' : (<><Rocket size={18} /> Deploy to Testnet</>)}
                </button>
                {!publicKey && (
                  <p className="help-text">Please connect your wallet to deploy</p>
                )}
              </div>

              {deployStatus && (
                <div className={`deploy-status status-${deployStatus.status}`}>
                  <div className="status-message">{deployStatus.message}</div>
                  {deployStatus.contractId && (
                    <code className="contract-id">{deployStatus.contractId}</code>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Interact Panel */}
          {activePanel === 'interact' && (
            <div className="panel-content">
              <h2 className="panel-title">Call Contract Functions</h2>

              {deployedContract ? (
                <>
                  <div className="function-selector">
                    <label className="field-label">Select Function:</label>
                    <select
                      value={selectedFunction?.name || ''}
                      onChange={(e) => {
                        const func = currentExample.functions.find(f => f.name === e.target.value);
                        setSelectedFunction(func);
                        setFunctionParams({});
                        setCallResult(null);
                      }}
                      className="input"
                    >
                      <option value="">-- Choose a function --</option>
                      {currentExample.functions.map(func => (
                        <option key={func.name} value={func.name}>
                          {func.name}() → {func.returns}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedFunction && (
                    <>
                      <div className="function-details">
                        <h3 className="function-name">{selectedFunction.name}()</h3>
                        <p className="function-desc">{selectedFunction.description}</p>
                        
                        {selectedFunction.params.length > 0 && (
                          <div className="function-params">
                            <h4>Parameters:</h4>
                            {selectedFunction.params.map((param, idx) => (
                              <div key={idx} className="param-field">
                                <label className="field-label">{param}</label>
                                <input
                                  type="text"
                                  className="input input-mono"
                                  placeholder={`Enter ${param}`}
                                  onChange={(e) => setFunctionParams({
                                    ...functionParams,
                                    [param]: e.target.value
                                  })}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={handleCallFunction}
                          disabled={loading}
                          className="btn btn-primary"
                        >
                          {loading ? 'Calling...' : (<><Zap size={16} /> Execute Function</>)}
                        </button>
                      </div>

                      {callResult && (
                        <div className={`call-result result-${callResult.status}`}>
                          <h4>Result:</h4>
                          {callResult.result ? (
                            <pre className="result-output">{callResult.result}</pre>
                          ) : (
                            <div className="result-message">{callResult.message}</div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className="empty-state">
                  <p>Deploy a contract first to interact with it</p>
                  <button
                    onClick={() => setActivePanel('deploy')}
                    className="btn btn-primary"
                  >
                    Go to Deploy
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Transactions Panel */}
          {activePanel === 'transactions' && (
            <div className="panel-content">
              <h2 className="panel-title">Transaction History</h2>

              {transactions.length === 0 ? (
                <div className="empty-state">
                  <p>No transactions yet</p>
                </div>
              ) : (
                <div className="transaction-list">
                  {transactions.map((tx, idx) => (
                    <div key={idx} className="transaction-item">
                      <div className="tx-type">
                        {tx.type === 'deploy' ? <Rocket size={16} /> : <Zap size={16} />} {tx.type}
                      </div>
                      <div className="tx-details">
                        {tx.type === 'deploy' ? (
                          <>
                            <div>Contract: <code>{tx.contractId}</code></div>
                          </>
                        ) : (
                          <>
                            <div>Function: <code>{tx.function}</code></div>
                            <div>Result: {tx.result}</div>
                          </>
                        )}
                        <div className="tx-time">{new Date(tx.timestamp).toLocaleString()}</div>
                      </div>
                      <a
                        href={tx.explorerUrl || `https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tx-link"
                      >
                        View →
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Info Panel */}
        <aside className="ide-right-panel">
          <div className="info-section">
            <h3 className="info-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <BookOpen size={18} /> About
            </h3>
            <p className="info-text">
              Write, deploy, and test Soroban smart contracts directly in your browser. 
              No local Rust installation required!
            </p>
          </div>

          <div className="info-section">
            <h3 className="info-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <Target size={18} /> How It Works
            </h3>
            <ol className="info-list">
              <li>Choose an example contract</li>
              <li>Edit the Rust code in the editor</li>
              <li>Connect your wallet</li>
              <li>Deploy to Stellar Testnet</li>
              <li>Interact with your contract</li>
            </ol>
          </div>

          <div className="info-section">
            <h3 className="info-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <Lightbulb size={18} /> Tips
            </h3>
            <ul className="info-list">
              <li>Start with the Counter example</li>
              <li>Use testnet XLM from Friendbot</li>
              <li>Check transaction history for results</li>
            </ul>
          </div>

          <div className="info-section">
            <h3 className="info-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <Link size={18} /> Resources
            </h3>
            <a href="https://soroban.stellar.org/docs" target="_blank" rel="noopener noreferrer" className="resource-link">
              Soroban Docs →
            </a>
            <a href="https://friendbot.stellar.org/" target="_blank" rel="noopener noreferrer" className="resource-link">
              Get Test XLM →
            </a>
            <a href="https://stellar.expert/explorer/testnet" target="_blank" rel="noopener noreferrer" className="resource-link">
              Stellar Expert →
            </a>
          </div>
        </aside>
      </div>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="modal-overlay" onClick={() => setShowApiKeyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title" style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <Settings size={24} /> AI Configuration
            </h2>
            <p className="modal-desc">
              Enter your Groq API key to enable AI features. Get a free key at{' '}
              <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer">
                console.groq.com
              </a>
            </p>
            
            <div className="form-field">
              <label htmlFor="api-key">Groq API Key</label>
              <input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="gsk_..."
                className="input-text"
                autoFocus
              />
            </div>

            <div className="modal-features">
              <h4>AI Features:</h4>
              <ul>
                <li><Bot size={16} style={{display: 'inline', marginRight: '8px'}} />Chat Assistant - Ask questions about Soroban & Rust</li>
                <li><Target size={16} style={{display: 'inline', marginRight: '8px'}} />Code Generation - Generate contracts from descriptions</li>
                <li><Lightbulb size={16} style={{display: 'inline', marginRight: '8px'}} />Code Explanation - Understand what code does</li>
                <li><Bug size={16} style={{display: 'inline', marginRight: '8px'}} />Debugging - Find and fix issues</li>
                <li><Sparkles size={16} style={{display: 'inline', marginRight: '8px'}} />Improvements - Get optimization suggestions</li>
                <li><Zap size={16} style={{display: 'inline', marginRight: '8px'}} />Inline Completion - Copilot-like autocomplete</li>
              </ul>
            </div>

            <div className="modal-actions">
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                className="btn btn-primary"
                disabled={!apiKey.trim()}
              >
                Save & Enable AI
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="ide-footer">
        <p>
          Orbital IDE · Stellar Testnet · Built with ❤️ for the community
          {' · '}
          <button onClick={onBackToLanding} className="footer-link">
            ← Back to Home
          </button>
        </p>
      </footer>
    </div>
  );
}

export default App;
