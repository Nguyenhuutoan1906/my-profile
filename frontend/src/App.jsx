import { useEffect, useMemo, useState } from 'react';
import Cropper from 'react-easy-crop';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import {
  FaArrowRight, FaBars, FaCertificate, FaCode, FaLock, FaSignOutAlt, FaTrash, FaPlus,
  FaFacebookF, FaGithub, FaInstagram, FaLinkedin, FaMoon, FaNodeJs, FaPaperPlane, FaReact, FaSearch,
  FaServer, FaSun, FaTimes
} from 'react-icons/fa';
import './App.css';
import './background.css';
import './contrast.css';
import './pixel-ui.css';
import './pixel-font.css';

const defaultProjects = [];
const certificates = [];
const defaultHeroImage = 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=900&q=85';
const apiUrl = import.meta.env.VITE_API_URL || '/api';

async function apiRequest(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, { credentials: 'include', ...options });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Không thể kết nối đến máy chủ.');
  return data;
}

const categoryLabel = { frontend: 'Frontend', backend: 'Backend', fullstack: 'Full-stack' };

function showGlassConfirm({ title, message, onConfirm }) {
  const overlay = document.createElement('div');
  overlay.className = 'glass-confirm-backdrop';
  const dialog = document.createElement('section');
  dialog.className = 'glass-confirm-dialog';
  dialog.setAttribute('role', 'alertdialog');
  dialog.setAttribute('aria-modal', 'true');
  const icon = document.createElement('div'); icon.className = 'glass-confirm-icon'; icon.textContent = '!';
  const heading = document.createElement('h2'); heading.textContent = title;
  const copy = document.createElement('p'); copy.textContent = message;
  const actions = document.createElement('div'); actions.className = 'glass-confirm-actions';
  const cancel = document.createElement('button'); cancel.className = 'glass-confirm-cancel'; cancel.type = 'button'; cancel.textContent = 'Hủy';
  const confirm = document.createElement('button'); confirm.className = 'glass-confirm-delete'; confirm.type = 'button'; confirm.textContent = 'Xóa';
  const close = () => { document.removeEventListener('keydown', onKey); overlay.remove(); };
  const onKey = event => { if (event.key === 'Escape') close(); };
  cancel.addEventListener('click', close);
  confirm.addEventListener('click', () => { onConfirm(); close(); });
  overlay.addEventListener('mousedown', event => { if (event.target === overlay) close(); });
  actions.append(cancel, confirm); dialog.append(icon, heading, copy, actions); overlay.append(dialog); document.body.append(overlay);
  document.addEventListener('keydown', onKey); confirm.focus();
}

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) ?? initialValue; } catch { return initialValue; }
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(value)); }, [key, value]);
  return [value, setValue];
}

function AppShell() {
  const [projects, setProjects] = useState(defaultProjects);
  const [certificateItems, setCertificateItems] = useState(certificates);
  const [heroImage, setHeroImage] = useLocalStorage('sean-profile-hero-image-v1', defaultHeroImage);
  const [csrfToken, setCsrfToken] = useState(() => sessionStorage.getItem('sean-admin-csrf') || '');
  const [dark, setDark] = useLocalStorage('portfolio-theme-dark', window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; }, [dark]);
  useEffect(() => { localStorage.removeItem('sean-admin-credentials-v1'); }, []);
  useEffect(() => {
    apiRequest('/auth/session').then(data => { sessionStorage.setItem('sean-admin-csrf', data.csrfToken); setCsrfToken(data.csrfToken); setIsAdmin(true); }).catch(() => { sessionStorage.removeItem('sean-admin-csrf'); setCsrfToken(''); });
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([apiRequest('/projects', { signal: controller.signal }), apiRequest('/certificates', { signal: controller.signal })])
      .then(([projectData, certificateData]) => { setProjects(projectData); setCertificateItems(certificateData); })
      .catch(reason => { if (reason.name !== 'AbortError') console.warn('Không thể tải nội dung từ API.', reason); });
    return () => controller.abort();
  }, []);
  useEffect(() => { setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }, [location.pathname]);
  useEffect(() => {
    const trackScroll = () => setIsScrolled(window.scrollY > 90);
    trackScroll(); window.addEventListener('scroll', trackScroll, { passive: true });
    return () => window.removeEventListener('scroll', trackScroll);
  }, []);
  useEffect(() => {
    const openAdmin = event => {
      if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'a') { event.preventDefault(); setLoginOpen(true); }
    };
    window.addEventListener('keydown', openAdmin);
    return () => window.removeEventListener('keydown', openAdmin);
  }, []);

  return <div className="site-shell">
    <header className={`site-header ${isScrolled ? 'is-compact' : ''}`}>
      <Link to="/" className="brand" aria-label="Trang chủ Sean">Sean<span>.</span></Link><span className="compact-folder" aria-hidden="true"><FaBars /></span>
      <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Mở menu" aria-expanded={menuOpen}><FaBars /></button>
      <nav className={menuOpen ? 'main-nav open' : 'main-nav'}>
        <NavLink to="/" end>Giới thiệu</NavLink>
        <NavLink to="/projects">Dự án</NavLink>
        <NavLink to="/certificates">Chứng chỉ</NavLink>
        <NavLink to="/contact">Liên hệ</NavLink>
        {isAdmin && <NavLink to="/admin">Quản trị</NavLink>}
        {isAdmin && <NavLink to="/profile">Hồ sơ</NavLink>}
        <button className="theme-button" onClick={() => setDark(!dark)} aria-label="Đổi giao diện">{dark ? <FaSun /> : <FaMoon />}</button>
      </nav>
    </header>
    <main className="page-transition" key={location.pathname}>
      <Routes>
        <Route path="/" element={<Home projects={projects} heroImage={heroImage} onSelect={setSelectedProject} />} />
        <Route path="/projects" element={<Projects projects={projects} onSelect={setSelectedProject} />} />
        <Route path="/certificates" element={<Certificates certificates={certificateItems} />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/admin" element={isAdmin ? <Admin projects={projects} setProjects={setProjects} certificates={certificateItems} setCertificates={setCertificateItems} onLogout={() => { void apiRequest('/auth/logout', { method: 'POST', headers: { 'X-CSRF-Token': csrfToken } }); sessionStorage.removeItem('sean-admin-csrf'); setCsrfToken(''); setIsAdmin(false); }} /> : <AdminRequired onLogin={() => setLoginOpen(true)} />} />
        <Route path="/profile" element={isAdmin ? <ProfileSecurityWithAppearance csrfToken={csrfToken} heroImage={heroImage} setHeroImage={setHeroImage} /> : <AdminRequired onLogin={() => setLoginOpen(true)} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </main>
    <Footer />
    {selectedProject && <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />}
    {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} onSuccess={token => { sessionStorage.setItem('sean-admin-csrf', token); setCsrfToken(token); setIsAdmin(true); setLoginOpen(false); }} />}
  </div>;
}

function Home({ projects, heroImage, onSelect }) {
  const headline = 'Thiết kế những trải nghiệm số ';
  const emphasis = 'có ý nghĩa.';
  const [typedLength, setTypedLength] = useState(0);
  useEffect(() => {
    const fullText = headline + emphasis;
    const delay = typedLength >= fullText.length ? 3000 : 42;
    const timer = window.setTimeout(() => setTypedLength(current => current >= fullText.length ? 0 : current + 1), delay);
    return () => window.clearTimeout(timer);
  }, [typedLength, headline, emphasis]);
  const typedHeadline = headline.slice(0, typedLength);
  const typedEmphasis = typedLength > headline.length ? emphasis.slice(0, typedLength - headline.length) : '';
  return <>
    <section className="hero section">
      <div className="hero-copy">
        <p className="eyebrow"><span /> Sẵn sàng cho dự án mới</p>
        <h1 aria-label={`${headline}${emphasis}`}><span>{typedHeadline}</span><em>{typedEmphasis}</em><i className="typing-cursor" aria-hidden="true" /></h1>
        <p className="lead">Tôi là Nguyễn Hữu Toàn — lập trình viên full-stack, tập trung tạo nên sản phẩm web gọn gàng, nhanh và dễ sử dụng.</p>
        <div className="actions"><Link className="button primary" to="/projects">Khám phá dự án <FaArrowRight /></Link><Link className="button ghost" to="/contact">Cùng hợp tác</Link></div>
        <div className="availability"><span className="status-dot" /> Đang nhận dự án freelance</div>
      </div>
      <div className="hero-visual"><div className="portrait-frame"><img src={heroImage} alt="Chân dung Nguyễn Hữu Toàn" /></div><div className="floating-card"><FaCode /> <span><strong>2+ năm</strong> xây dựng sản phẩm web</span></div></div>
    </section>
    <section className="section intro-grid">
      <p className="section-kicker">CHUYÊN MÔN</p><h2>Biến ý tưởng thành sản phẩm<br />mọi người muốn sử dụng.</h2>
      <p className="intro-text">Từ định hình trải nghiệm đến phát triển và tối ưu, tôi quan tâm đến từng chi tiết nhỏ tạo nên một sản phẩm chỉn chu.</p>
    </section>
    <section className="section skills-grid">
      <Skill icon={<FaReact />} name="Frontend" detail="React, JavaScript, giao diện đáp ứng" /><Skill icon={<FaNodeJs />} name="Backend" detail="Node.js, API, hệ thống dữ liệu" /><Skill icon={<FaServer />} name="Cloud & hiệu năng" detail="Triển khai, tối ưu và vận hành" />
    </section>
    <section className="section featured-section">
      <div className="section-heading"><div><p className="section-kicker">DỰ ÁN NỔI BẬT</p><h2>Không gian sản phẩm</h2></div><Link to="/projects" className="text-link">Xem tất cả <FaArrowRight /></Link></div>
      <div className="project-grid">{projects.slice(0, 3).map(project => <ProjectCard key={project.id} project={project} onSelect={onSelect} />)}</div>{!projects.length && <div className="empty-state home-empty"><FaCode /><h3>Dự án đầu tiên đang chờ được thêm</h3><p>Đăng nhập Quản trị để tự cập nhật portfolio của bạn.</p></div>}
    </section>
  </>;
}

function Skill({ icon, name, detail }) { return <article className="skill-card"><div className="skill-icon">{icon}</div><h3>{name}</h3><p>{detail}</p></article>; }

function ProjectCard({ project, onSelect }) { return <article className="project-card"><button className="project-image" onClick={() => onSelect(project)} aria-label={`Xem ${project.title}`}><img src={project.image} alt="" /><span className="project-arrow"><FaArrowRight /></span></button><div className="project-meta"><span>{categoryLabel[project.category]}</span><span>{project.year}</span></div><h3>{project.title}</h3><p>{project.desc}</p><button className="text-link card-link" onClick={() => onSelect(project)}>Xem chi tiết <FaArrowRight /></button></article>; }

function Projects({ projects, onSelect }) {
  const [query, setQuery] = useState(''); const [filter, setFilter] = useState('all');
  const filtered = useMemo(() => projects.filter(p => (filter === 'all' || p.category === filter) && `${p.title} ${p.desc} ${p.tech.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [projects, filter, query]);
  return <section className="section page-section"><p className="section-kicker">DANH MỤC</p><h1 className="page-title">Dự án chọn lọc</h1><p className="page-lead">Những sản phẩm tôi đã tham gia xây dựng, từ ý tưởng ban đầu đến trải nghiệm hoàn thiện.</p><div className="project-tools"><div className="filters">{['all', 'frontend', 'backend', 'fullstack'].map(item => <button key={item} onClick={() => setFilter(item)} className={filter === item ? 'active' : ''}>{item === 'all' ? 'Tất cả' : categoryLabel[item]}</button>)}</div><label className="search"><FaSearch /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm dự án" /></label></div><div className="project-grid">{filtered.map(project => <ProjectCard key={project.id} project={project} onSelect={onSelect} />)}</div>{!filtered.length && <div className="empty-state"><FaCode /><h3>{projects.length ? 'Chưa tìm thấy dự án' : 'Chưa có dự án nào'}</h3><p>{projects.length ? 'Thử thay đổi từ khóa hoặc bộ lọc của bạn.' : 'Bạn có thể tự thêm dự án từ khu vực Quản trị.'}</p></div>}</section>;
}

function Certificates({ certificates }) { return <section className="section page-section"><p className="section-kicker">HỌC TẬP LIÊN TỤC</p><h1 className="page-title">Chứng chỉ & nền tảng</h1><p className="page-lead">Các cột mốc chuyên môn trong hành trình làm nghề.</p><div className="certificate-list">{certificates.map((cert, index) => <article className="certificate" key={cert.id ?? cert.title}><div className="certificate-number">{String(index + 1).padStart(2, '0')}</div><div><FaCertificate className="certificate-icon" /><h3>{cert.title}</h3><p>{cert.issuer}</p></div><time>{cert.date}</time></article>)}</div>{!certificates.length && <div className="empty-state"><FaCertificate /><h3>Chưa có chứng chỉ nào</h3><p>Bạn có thể tự thêm chứng chỉ từ khu vực Quản trị.</p></div>}</section>; }

function Contact() {
  const [sent, setSent] = useState(false); const [form, setForm] = useState({ name: '', email: '', message: '' });
  const submit = e => { e.preventDefault(); setSent(true); setForm({ name: '', email: '', message: '' }); };
  return <section className="section contact-page"><div><p className="section-kicker">LIÊN HỆ</p><h1 className="page-title">Hãy tạo nên điều<br />đáng nhớ.</h1><p className="page-lead">Có ý tưởng, dự án hoặc chỉ muốn nói lời chào? Tôi luôn sẵn lòng kết nối.</p><a className="email-link" href="mailto:nguyenhuutoan1906@gmail.com">nguyenhuutoan1906@gmail.com <FaArrowRight /></a><div className="socials"><a href="https://github.com/nguyenhuutoan1906" target="_blank" rel="noreferrer" aria-label="GitHub"><FaGithub /></a><a href="https://facebook.com/nguyenhuutoan1906" target="_blank" rel="noreferrer" aria-label="Facebook"><FaFacebookF /></a><a href="https://instagram.com/sean_nht196" target="_blank" rel="noreferrer" aria-label="Instagram"><FaInstagram /></a></div></div><form className="contact-form" onSubmit={submit}>{sent && <div className="success-message">Cảm ơn bạn! Tin nhắn đã được ghi nhận.</div>}<label>Họ và tên<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Tên của bạn" /></label><label>Email<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="ban@email.com" /></label><label>Nội dung<textarea required rows="5" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Bạn muốn cùng xây dựng điều gì?" /></label><button className="button primary" type="submit">Gửi lời nhắn <FaPaperPlane /></button></form></section>;
}

function LoginModal({ onClose, onSuccess }) {
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState('');
  const submit = async event => {
    event.preventDefault(); setError('');
    try { const data = await apiRequest('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) }); onSuccess(data.csrfToken); }
    catch (reason) { setError(reason.message || 'Không thể đăng nhập. Vui lòng thử lại.'); }
  };
  return <div className="modal-backdrop" onMouseDown={onClose} role="presentation"><form className="login-modal" onMouseDown={e => e.stopPropagation()} onSubmit={submit} aria-label="Đăng nhập quản trị"><button className="modal-close" type="button" onClick={onClose} aria-label="Đóng"><FaTimes /></button><FaLock className="login-icon" /><p className="section-kicker">KHU VỰC RIÊNG</p><h2>Đăng nhập quản trị</h2><p>Quản lý các dự án hiển thị trên website.</p>{error && <div className="login-error">{error}</div>}<label>Tài khoản<input autoFocus required value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" /></label><label>Mật khẩu<input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" /></label><button className="button primary" type="submit">Đăng nhập</button></form></div>;
}

function AdminRequired({ onLogin }) { return <section className="section not-found"><FaLock className="locked-icon" /><p className="section-kicker">KHU VỰC RIÊNG</p><h1 className="page-title">Cần quyền quản trị</h1><button className="button primary" onClick={onLogin}>Đăng nhập quản trị</button></section>; }

function ProfileSecurity({ csrfToken }) {
  const [currentPassword, setCurrentPassword] = useState(''); const [newPassword, setNewPassword] = useState(''); const [confirmation, setConfirmation] = useState(''); const [status, setStatus] = useState('');
  const rules = [newPassword.length >= 8, /[A-Z]/.test(newPassword), /\d/.test(newPassword)];
  const submit = async event => {
    event.preventDefault();
    if (!rules.every(Boolean)) { setStatus('Mật khẩu mới chưa đáp ứng các yêu cầu bảo mật.'); return; }
    if (newPassword !== confirmation) { setStatus('Xác nhận mật khẩu chưa khớp.'); return; }
    try {
      await apiRequest('/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ currentPassword, newPassword }) });
      setCurrentPassword(''); setNewPassword(''); setConfirmation(''); setStatus('Đã cập nhật mật khẩu thành công.');
    } catch (reason) { setStatus(reason.message || 'Không thể cập nhật mật khẩu.'); }
  };
  return <section className="section page-section profile-security"><p className="section-kicker">HỒ SƠ</p><h1 className="page-title">Hồ sơ & bảo mật</h1><p className="page-lead">Quản lý thông tin truy cập cho khu vực quản trị của portfolio.</p><div className="security-layout"><article className="profile-card"><div className="profile-monogram">NT</div><div><p className="section-kicker">CHỦ HỒ SƠ</p><h2>Nguyễn Hữu Toàn</h2><p>Full-stack Developer · Sean</p></div><div className="security-status"><span /> Bảo mật cục bộ đang bật</div></article><form className="security-form" onSubmit={submit}><div className="security-form-heading"><FaLock /><div><h2>Đổi mật khẩu</h2><p>Dùng mật khẩu mạnh để bảo vệ quyền quản trị.</p></div></div>{status && <div className={status.startsWith('Đã') ? 'success-message' : 'image-error'}>{status}</div>}<label>Mật khẩu hiện tại<input required type="password" value={currentPassword} onChange={e => { setCurrentPassword(e.target.value); setStatus(''); }} autoComplete="current-password" /></label><label>Mật khẩu mới<input required type="password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setStatus(''); }} autoComplete="new-password" /></label><div className="password-rules"><span className={rules[0] ? 'met' : ''}>Ít nhất 8 ký tự</span><span className={rules[1] ? 'met' : ''}>Có chữ in hoa</span><span className={rules[2] ? 'met' : ''}>Có chữ số</span></div><label>Xác nhận mật khẩu mới<input required type="password" value={confirmation} onChange={e => { setConfirmation(e.target.value); setStatus(''); }} autoComplete="new-password" /></label><button className="button primary" type="submit">Cập nhật bảo mật <FaLock /></button><p className="security-note">Portfolio này là ứng dụng tĩnh: thông tin đăng nhập chỉ được lưu cục bộ trên trình duyệt. Hãy dùng backend để bảo vệ thật sự khi triển khai công khai.</p></form></div></section>;
}

function cropImage(source, crop) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas'); canvas.width = crop.width; canvas.height = crop.height;
      const context = canvas.getContext('2d'); context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    image.onerror = reject; image.src = source;
  });
}

function ProfileAppearance({ heroImage, setHeroImage }) {
  const [message, setMessage] = useState(''); const [source, setSource] = useState(''); const [crop, setCrop] = useState({ x: 0, y: 0 }); const [zoom, setZoom] = useState(1); const [croppedArea, setCroppedArea] = useState(null);
  const selectImage = event => {
    const file = event.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { setMessage('Vui lòng chọn một tệp hình ảnh hợp lệ.'); return; }
    if (file.size > 2 * 1024 * 1024) { setMessage('Ảnh cần có dung lượng tối đa 2 MB.'); return; }
    const reader = new FileReader(); reader.onload = () => { setSource(reader.result); setCrop({ x: 0, y: 0 }); setZoom(1); }; reader.readAsDataURL(file); event.target.value = '';
  };
  const saveCrop = async () => {
    if (!croppedArea) return;
    try { setHeroImage(await cropImage(source, croppedArea)); setSource(''); setMessage('Đã cập nhật ảnh hồ sơ.'); }
    catch { setMessage('Không thể cắt ảnh. Vui lòng thử ảnh khác.'); }
  };
  return <section className="section page-section profile-security"><p className="section-kicker">HỒ SƠ</p><h1 className="page-title">Ảnh giới thiệu</h1><p className="page-lead">Thay đổi ảnh chân dung hiển thị ở trang Giới thiệu.</p><div className="appearance-layout"><div className="appearance-preview"><img src={heroImage} alt="Xem trước ảnh hồ sơ" /><span>Ảnh hiển thị</span></div><div className="appearance-controls"><FaCode className="appearance-icon" /><h2>Cập nhật ảnh hồ sơ</h2><p>Chọn ảnh PNG, JPG hoặc WebP, sau đó căn chỉnh phần ảnh bạn muốn dùng.</p>{message && <div className={message.startsWith('Đã') ? 'success-message' : 'image-error'}>{message}</div>}<label className="upload-image-button">Chọn và cắt ảnh<input type="file" accept="image/png,image/jpeg,image/webp" onChange={selectImage} /></label><button className="button ghost" type="button" onClick={() => { setHeroImage(defaultHeroImage); setMessage('Đã khôi phục ảnh mặc định.'); }}>Khôi phục ảnh mặc định</button><small>Ảnh được lưu cục bộ trên trình duyệt, tối đa 2 MB.</small></div></div>{source && <div className="cropper-backdrop" role="presentation"><section className="cropper-dialog" role="dialog" aria-modal="true" aria-label="Cắt ảnh hồ sơ"><div className="cropper-heading"><div><p className="section-kicker">CẮT ẢNH</p><h2>Chọn khung ảnh</h2></div><button type="button" onClick={() => setSource('')}>Hủy</button></div><div className="cropper-canvas"><Cropper image={source} crop={crop} zoom={zoom} aspect={4 / 5} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_area, pixels) => setCroppedArea(pixels)} /></div><label className="zoom-control">Thu phóng<input type="range" min="1" max="3" step="0.05" value={zoom} onChange={event => setZoom(Number(event.target.value))} /></label><div className="cropper-actions"><button className="button ghost" type="button" onClick={() => setSource('')}>Hủy</button><button className="button primary" type="button" onClick={saveCrop}>Dùng phần ảnh này</button></div></section></div>}</section>;
}

function ProfileSecurityWithAppearance({ csrfToken, heroImage, setHeroImage }) {
  return <><ProfileSecurity csrfToken={csrfToken} /><ProfileAppearance heroImage={heroImage} setHeroImage={setHeroImage} /></>;
}

function Admin({ projects, setProjects, certificates, setCertificates, onLogout }) {
  const [draft, setDraft] = useState({ title: '', category: 'frontend', year: new Date().getFullYear().toString(), desc: '', image: '', tech: '' });
  const [editingId, setEditingId] = useState(null);
  const [imageError, setImageError] = useState('');
  const removeItem = async (type, item) => {
    try {
      await apiRequest(`/${type}/${item.id}`, { method: 'DELETE', headers: { 'X-CSRF-Token': sessionStorage.getItem('sean-admin-csrf') || '' } });
      if (type === 'certificates') setCertificates(current => current.filter(entry => entry.id !== item.id));
      else { setProjects(current => current.filter(entry => entry.id !== item.id)); if (editingId === item.id) reset(); }
    } catch (reason) { window.alert(reason.message || 'Không thể xóa dữ liệu.'); }
  };
  useEffect(() => {
    const interceptDelete = event => {
      const button = event.target.closest('.admin-page button.delete');
      if (!button) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const row = button.closest('article'); const list = button.closest('.manage-list');
      const index = [...list.querySelectorAll('article')].indexOf(row);
      const isCertificate = list.classList.contains('certificate-manage-list');
      const item = isCertificate ? certificates[index] : projects[index];
      if (!item) return;
      showGlassConfirm({ title: isCertificate ? 'Xóa chứng chỉ?' : 'Xóa dự án?', message: `Bạn có chắc muốn xóa “${item.title}”? Thao tác này không thể hoàn tác.`, onConfirm: () => { void removeItem(isCertificate ? 'certificates' : 'projects', item); } });
    };
    document.addEventListener('click', interceptDelete, true);
    return () => document.removeEventListener('click', interceptDelete, true);
  }, [projects, certificates, editingId, setProjects, setCertificates]);
  const reset = () => { setDraft({ title: '', category: 'frontend', year: new Date().getFullYear().toString(), desc: '', image: '', tech: '' }); setEditingId(null); setImageError(''); };
  const submit = async event => {
    event.preventDefault();
    if (!draft.image) { setImageError('Vui lòng chọn ảnh dự án từ máy tính trước khi lưu.'); return; }
    const project = { ...draft, tech: draft.tech.split(',').map(item => item.trim()).filter(Boolean) };
    const options = { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': sessionStorage.getItem('sean-admin-csrf') || '' }, body: JSON.stringify(project) };
    try {
      const saved = await apiRequest(editingId ? `/projects/${editingId}` : '/projects', options);
      setProjects(current => editingId ? current.map(item => item.id === editingId ? saved : item) : [saved, ...current]);
      reset();
    } catch (reason) { setImageError(reason.message || 'Không thể lưu dự án.'); }
  };
  const edit = project => { setImageError(''); setEditingId(project.id); setDraft({ ...project, tech: project.tech.join(', ') }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const selectImage = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setImageError('Vui lòng chọn một tệp hình ảnh.'); return; }
    if (file.size > 2 * 1024 * 1024) { setImageError('Ảnh cần có dung lượng tối đa 2 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => { setDraft(current => ({ ...current, image: reader.result })); setImageError(''); };
    reader.readAsDataURL(file);
  };
  return <section className="section page-section admin-page"><div className="admin-title"><div><p className="section-kicker">QUẢN TRỊ</p><h1 className="page-title">Quản lý nội dung</h1></div><button className="logout" onClick={onLogout}><FaSignOutAlt /> Đăng xuất</button></div><div className="admin-stats"><span><strong>{projects.length}</strong>Tổng dự án</span><span><strong>{certificates.length}</strong>Chứng chỉ</span><span><strong>{projects.filter(p => p.category === 'frontend').length}</strong>Frontend</span></div><section className="project-manager"><div className="admin-section-heading"><div><p className="section-kicker">DỰ ÁN</p><h2>Quản lý dự án</h2></div><div className="certificate-heading-actions"><span>{projects.length} dự án</span>{editingId && <button type="button" className="cancel-edit-header" onClick={reset}>Hủy chỉnh sửa</button>}</div></div><div className="admin-layout"><form className="project-form" onSubmit={submit}>{editingId && <div className="editing-notice">Đang chỉnh sửa dự án. Các thay đổi chỉ được lưu khi bạn nhấn “Lưu thay đổi”.</div>}<h2>{editingId ? 'Cập nhật dự án' : 'Thêm dự án mới'}</h2><label>Tên dự án<input required value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label><div className="form-row"><label>Phân loại<select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}><option value="frontend">Frontend</option><option value="backend">Backend</option><option value="fullstack">Full-stack</option></select></label><label>Năm<input required value={draft.year} onChange={e => setDraft({ ...draft, year: e.target.value })} /></label></div><label>Ảnh dự án<input className="file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={selectImage} /> <small>PNG, JPG hoặc WebP — tối đa 2 MB.</small></label>{imageError && <div className="image-error">{imageError}</div>}{draft.image && <div className="image-preview"><img src={draft.image} alt="Xem trước ảnh dự án" /><button type="button" onClick={() => setDraft({ ...draft, image: '' })}>Bỏ ảnh</button></div>}<label>Công nghệ <small>(ngăn cách bằng dấu phẩy)</small><input value={draft.tech} onChange={e => setDraft({ ...draft, tech: e.target.value })} placeholder="React, Node.js" /></label><label>Mô tả<textarea required rows="5" value={draft.desc} onChange={e => setDraft({ ...draft, desc: e.target.value })} /></label><div className="form-actions"><button className="button primary" type="submit"><FaPlus /> {editingId ? 'Lưu thay đổi' : 'Thêm dự án'}</button>{editingId && <button className="button ghost cancel-edit" type="button" onClick={reset}>Hủy chỉnh sửa</button>}</div></form><div className="manage-list project-manage-list"><h2>Danh sách dự án</h2>{projects.map(project => <article key={project.id} className={editingId === project.id ? 'is-editing' : ''}><img src={project.image} alt="" /><div><span>{categoryLabel[project.category]} · {project.year}</span><h3>{project.title}</h3></div>{editingId === project.id ? <button className="cancel-row-button" type="button" onClick={reset}>Hủy sửa</button> : <button onClick={() => edit(project)}>Sửa</button>}<button className="delete" onClick={() => { if (window.confirm(`Xóa dự án “${project.title}”?`)) setProjects(projects.filter(item => item.id !== project.id)); }} aria-label={`Xóa ${project.title}`}><FaTrash /></button></article>)}</div></div></section><CertificateManager certificates={certificates} setCertificates={setCertificates} /></section>;
}

function CertificateManager({ certificates, setCertificates }) {
  const empty = { title: '', issuer: '', date: '' };
  const [draft, setDraft] = useState(empty); const [editingId, setEditingId] = useState(null);
  const submit = async event => {
    event.preventDefault();
    const options = { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': sessionStorage.getItem('sean-admin-csrf') || '' }, body: JSON.stringify(draft) };
    try {
      const saved = await apiRequest(editingId ? `/certificates/${editingId}` : '/certificates', options);
      setCertificates(current => editingId ? current.map(item => item.id === editingId ? saved : item) : [saved, ...current]);
      setDraft(empty); setEditingId(null);
    } catch (reason) { window.alert(reason.message || 'Không thể lưu chứng chỉ.'); }
  };
  const edit = certificate => { setEditingId(certificate.id); setDraft({ title: certificate.title, issuer: certificate.issuer, date: certificate.date }); };
  const cancelEdit = () => { setDraft(empty); setEditingId(null); };
  return <section className="certificate-manager"><div className="admin-section-heading"><div><p className="section-kicker">CHỨNG CHỈ</p><h2>Quản lý chứng chỉ</h2></div><div className="certificate-heading-actions"><span>{certificates.length} chứng chỉ</span>{editingId && <button type="button" className="cancel-edit-header" onClick={cancelEdit}>Hủy chỉnh sửa</button>}</div></div><div className="admin-layout"><form className="project-form certificate-form" onSubmit={submit}>{editingId && <div className="editing-notice">Đang chỉnh sửa chứng chỉ. Các thay đổi chỉ được lưu khi bạn nhấn “Lưu thay đổi”.</div>}<h2>{editingId ? 'Cập nhật chứng chỉ' : 'Thêm chứng chỉ mới'}</h2><label>Tên chứng chỉ<input required value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="Ví dụ: AWS Cloud Practitioner" /></label><label>Tổ chức cấp<input required value={draft.issuer} onChange={e => setDraft({ ...draft, issuer: e.target.value })} placeholder="Ví dụ: Amazon Web Services" /></label><label>Thời gian cấp<input required value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} placeholder="Ví dụ: 07/2026" /></label><div className="form-actions"><button className="button primary" type="submit"><FaCertificate /> {editingId ? 'Lưu thay đổi' : 'Thêm chứng chỉ'}</button>{editingId && <button className="button ghost cancel-edit" type="button" onClick={cancelEdit}>Hủy chỉnh sửa</button>}</div></form><div className="manage-list certificate-manage-list"><h2>Danh sách chứng chỉ</h2>{certificates.map(certificate => <article key={certificate.id ?? certificate.title} className={editingId === certificate.id ? 'is-editing' : ''}><FaCertificate className="manage-cert-icon" /><div><span>{certificate.date}</span><h3>{certificate.title}</h3><p>{certificate.issuer}</p></div>{editingId === certificate.id ? <button className="cancel-row-button" type="button" onClick={cancelEdit}>Hủy sửa</button> : <button onClick={() => edit(certificate)}>Sửa</button>}<button className="delete" onClick={() => { if (window.confirm(`Xóa chứng chỉ “${certificate.title}”?`)) setCertificates(certificates.filter(item => item.id !== certificate.id)); }} aria-label={`Xóa ${certificate.title}`}><FaTrash /></button></article>)}</div></div></section>;
}

function ProjectModal({ project, onClose }) { useEffect(() => { const key = e => e.key === 'Escape' && onClose(); window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [onClose]); return <div className="modal-backdrop" onMouseDown={onClose} role="presentation"><article className="modal" onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={project.title}><button className="modal-close" onClick={onClose} aria-label="Đóng"><FaTimes /></button><img src={project.image} alt="" /><div className="modal-content"><div className="project-meta"><span>{categoryLabel[project.category]}</span><span>{project.year}</span></div><h2>{project.title}</h2><p>{project.desc}</p><div className="tech-list">{project.tech.map(tech => <span key={tech}>{tech}</span>)}</div></div></article></div>; }

function NotFound() { return <section className="section not-found"><p className="section-kicker">404</p><h1 className="page-title">Không tìm thấy trang</h1><Link className="button primary" to="/">Về trang chủ</Link></section>; }
function Footer() { return <footer className="site-footer"><div className="footer-main"><div className="footer-brand"><Link to="/" className="brand">Sean<span>.</span></Link><p>Portfolio cá nhân của Nguyễn Hữu Toàn — nơi ý tưởng được chuyển thành những trải nghiệm số chỉn chu.</p><div className="footer-socials"><a href="https://github.com/nguyenhuutoan1906" target="_blank" rel="noreferrer" aria-label="GitHub"><FaGithub /></a><a href="https://facebook.com/nguyenhuutoan1906" target="_blank" rel="noreferrer" aria-label="Facebook"><FaFacebookF /></a><a href="https://instagram.com/sean_nht196" target="_blank" rel="noreferrer" aria-label="Instagram"><FaInstagram /></a></div></div><div className="footer-links"><h3>Khám phá</h3><Link to="/">Giới thiệu</Link><Link to="/projects">Dự án</Link><Link to="/certificates">Chứng chỉ</Link><Link to="/contact">Liên hệ</Link></div><div className="footer-contact"><h3>Kết nối</h3><a href="mailto:hello@sean.dev">nguyenhuutoan1906@gmail.com</a><p><span /> Sẵn sàng hợp tác</p></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Nguyễn Hữu Toàn. Bảo lưu mọi quyền.</span><span>Thiết kế & phát triển bởi Sean</span></div></footer>; }
export default function App() { return <BrowserRouter><AppShell /></BrowserRouter>; }
