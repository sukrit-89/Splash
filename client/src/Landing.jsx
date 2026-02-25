import { useState } from 'react';
import { 
  Code2, 
  Rocket, 
  Sparkles, 
  Zap, 
  Clock, 
  Book, 
  Github,
  ArrowRight,
  CheckCircle2,
  Bot,
  Shield,
  Quote
} from 'lucide-react';
import './Landing.css';

function Landing({ onEnterIDE }) {
  const [email, setEmail] = useState('');

  return (
    <div className="landing">
      <div className="grain-overlay"></div>

      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="nav-brand">
            <img src="/Orbital-IDE.png" alt="Orbital IDE" className="nav-logo" />
            <span className="nav-title">
              <span className="brand-name">Orbital</span>
              <span className="brand-type">IDE</span>
            </span>
          </div>
          <div className="nav-actions">
            <a href="https://github.com/yourusername/orbital-ide" target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-small">
              <Github size={16} />
              GitHub
            </a>
            <button onClick={onEnterIDE} className="btn btn-primary btn-small">
              Launch IDE <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <Sparkles size={16} />
              <span>AI-Powered Smart Contract Development</span>
            </div>
            <h1 className="hero-title">
              Build Soroban Contracts
              <br />
              <span className="gradient-text">Without Installing Anything</span>
            </h1>
            <p className="hero-desc">
              Write, deploy, and test Stellar smart contracts directly in your browser. 
              Powered by AI assistance, Monaco Editor, and zero-setup magic.
            </p>
            <div className="hero-cta">
              <button onClick={onEnterIDE} className="btn btn-primary btn-large">
                <Rocket size={20} />
                BUILD IT
              </button>
            </div>
            <div className="hero-stats">
              <div className="stat">
                <Clock size={24} />
                <div className="stat-content">
                  <div className="stat-value">0 min</div>
                  <div className="stat-label">Setup Time</div>
                </div>
              </div>
              <div className="stat">
                <Code2 size={24} />
                <div className="stat-content">
                  <div className="stat-value">5</div>
                  <div className="stat-label">Example Contracts</div>
                </div>
              </div>
              <div className="stat">
                <Bot size={24} />
                <div className="stat-content">
                  <div className="stat-value">AI</div>
                  <div className="stat-label">Powered Assistant</div>
                </div>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-window">
              <div className="window-header">
                <div className="window-dots">
                  <span></span><span></span><span></span>
                </div>
                <span className="window-title">counter.rs</span>
              </div>
              <div className="window-content">
                <pre className="code-preview">
{`#![no_std]
use soroban_sdk::{contract, contractimpl, Env};

#[contract]
pub struct Counter;

#[contractimpl]
impl Counter {
    pub fn increment(env: Env) -> u32 {
        let count: u32 = env.storage()
            .instance()
            .get(&"COUNTER")
            .unwrap_or(0);
        
        let new_count = count + 1;
        env.storage().instance()
            .set(&"COUNTER", &new_count);
        new_count
    }
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="features-container">
          <div className="section-header">
            <h2 className="section-title">Everything You Need to Build Smart Contracts</h2>
            <p className="section-desc">Professional development environment in your browser</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <Code2 size={32} />
              </div>
              <h3 className="feature-title">VS Code Quality Editor</h3>
              <p className="feature-desc">
                Monaco-powered editor with Rust syntax highlighting, autocomplete, 
                and all the shortcuts you love.
              </p>
            </div>
            <div className="feature-card featured">
              <div className="feature-icon">
                <Bot size={32} />
              </div>
              <h3 className="feature-title">AI Coding Assistant</h3>
              <p className="feature-desc">
                Chat with AI, generate contracts, explain code, debug issues, 
                and get inline completions like GitHub Copilot.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Rocket size={32} />
              </div>
              <h3 className="feature-title">One-Click Deployment</h3>
              <p className="feature-desc">
                Deploy contracts to Stellar Testnet instantly. No CLI commands, 
                no configuration files, just click and go.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Zap size={32} />
              </div>
              <h3 className="feature-title">Interactive Testing</h3>
              <p className="feature-desc">
                Call contract functions with a visual interface. See results 
                instantly with full transaction history.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Book size={32} />
              </div>
              <h3 className="feature-title">Example Library</h3>
              <p className="feature-desc">
                5 production-ready contracts: Counter, Token, Escrow, Voting, 
                and Hello World. Learn by example.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Shield size={32} />
              </div>
              <h3 className="feature-title">Safe Testnet Environment</h3>
              <p className="feature-desc">
                Experiment freely on Stellar Testnet. No real assets at risk. 
                Perfect for learning and prototyping.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials">
        <div className="testimonials-container">
          <div className="section-header">
            <h2 className="section-title">Loved by Developers</h2>
            <p className="section-desc">See what builders are saying</p>
          </div>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <Quote size={32} className="quote-icon" />
              <p className="testimonial-text">
                "Finally, a way to teach Soroban without spending 30 minutes on Rust setup. 
                My workshop attendees deployed contracts in under 5 minutes."
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">SD</div>
                <div className="author-info">
                  <div className="author-name">Sarah Dev</div>
                  <div className="author-role">Workshop Instructor</div>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <Quote size={32} className="quote-icon" />
              <p className="testimonial-text">
                "The AI assistant is incredible. It explained Soroban storage patterns 
                better than most docs. Saved me hours of debugging."
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">MK</div>
                <div className="author-info">
                  <div className="author-name">Mike Kim</div>
                  <div className="author-role">Smart Contract Developer</div>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <Quote size={32} className="quote-icon" />
              <p className="testimonial-text">
                "Perfect for rapid prototyping. I test contract logic here before 
                setting up local dev. Zero friction = maximum productivity."
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">AL</div>
                <div className="author-info">
                  <div className="author-name">Alex Lee</div>
                  <div className="author-role">dApp Founder</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing/API Section */}
      <section className="pricing">
        <div className="pricing-container">
          <div className="section-header">
            <h2 className="section-title">Free to Use, AI Optional</h2>
            <p className="section-desc">Core IDE features are completely free</p>
          </div>
          <div className="pricing-cards">
            <div className="pricing-card">
              <div className="pricing-badge">FREE</div>
              <h3 className="pricing-title">Core IDE</h3>
              <div className="pricing-price">$0<span>/forever</span></div>
              <ul className="pricing-features">
                <li><CheckCircle2 size={16} /> Monaco Editor</li>
                <li><CheckCircle2 size={16} /> 5 Example Contracts</li>
                <li><CheckCircle2 size={16} /> Contract Deployment</li>
                <li><CheckCircle2 size={16} /> Function Testing</li>
                <li><CheckCircle2 size={16} /> Transaction History</li>
                <li><CheckCircle2 size={16} /> No Sign-up Required</li>
              </ul>
              <button onClick={onEnterIDE} className="btn btn-primary btn-block">
                Start Now
              </button>
            </div>
            <div className="pricing-card featured">
              <div className="pricing-badge featured">AI POWERED</div>
              <h3 className="pricing-title">With AI Assistant</h3>
              <div className="pricing-price">Free<span>/Groq API</span></div>
              <ul className="pricing-features">
                <li><CheckCircle2 size={16} /> Everything in Core</li>
                <li><CheckCircle2 size={16} /> AI Chat Assistant</li>
                <li><CheckCircle2 size={16} /> Code Generation</li>
                <li><CheckCircle2 size={16} /> Code Explanation</li>
                <li><CheckCircle2 size={16} /> Debugging Help</li>
                <li><CheckCircle2 size={16} /> Inline Completions</li>
              </ul>
              <button onClick={onEnterIDE} className="btn btn-primary btn-block">
                Launch IDE & Configure
              </button>
              <p className="pricing-note">
                Requires free <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer">Groq API key</a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="cta-container">
          <h2 className="cta-title">Ready to Build the Next Big dApp?</h2>
          <p className="cta-desc">Join developers building on Stellar with zero setup friction</p>
          <button onClick={onEnterIDE} className="btn btn-primary btn-large">
            <Rocket size={24} />
            Launch Orbital IDE
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <img src="/Orbital-IDE.png" alt="Orbital IDE" className="footer-logo" />
            <div className="footer-title">
              <span className="brand-name">Orbital</span>
              <span className="brand-type">IDE</span>
            </div>
          </div>
          <div className="footer-links">
            <div className="footer-section">
              <h4 className="footer-heading">Resources</h4>
              <a href="https://soroban.stellar.org/docs" target="_blank" rel="noopener noreferrer">Soroban Docs</a>
              <a href="https://stellar.org" target="_blank" rel="noopener noreferrer">Stellar</a>
              <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer">Groq API</a>
            </div>
            <div className="footer-section">
              <h4 className="footer-heading">Community</h4>
              <a href="https://discord.gg/stellar" target="_blank" rel="noopener noreferrer">Discord</a>
              <a href="https://github.com/yourusername/orbital-ide" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="https://twitter.com/stellar" target="_blank" rel="noopener noreferrer">Twitter</a>
            </div>
            <div className="footer-section">
              <h4 className="footer-heading">Tools</h4>
              <a href="https://www.freighter.app/" target="_blank" rel="noopener noreferrer">Freighter Wallet</a>
              <a href="https://stellar.expert/explorer/testnet" target="_blank" rel="noopener noreferrer">Stellar Expert</a>
              <a href="https://friendbot.stellar.org/" target="_blank" rel="noopener noreferrer">Friendbot</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>Built with ❤️ for the Stellar community · Stellar Dojo Yellow Belt</p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
