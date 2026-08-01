# 🆓 Deploying Contexa on AWS Free Tier — Complete Guide

> **Instance**: `t2.micro` (1 vCPU · 1 GB RAM) — **100% Free for 12 months**
> **OS**: Ubuntu 22.04 LTS
> **Strategy**: Build frontend **locally** → upload to server. Use a **4 GB swap file** to handle Python/ChromaDB memory spikes.

---

## ⚠️ Free Tier Reality Check

| What | Reality |
|------|---------|
| **Instance** | `t2.micro` — 1 vCPU, 1 GB RAM |
| **Storage** | Up to **30 GB EBS free** |
| **Hours** | 750 hrs/month (enough for 1 always-on instance) |
| **The problem** | `sentence-transformers` alone needs ~700 MB RAM |
| **The fix** | Add a **4 GB swap file** — server stays alive, just slightly slower |

---

## 🗺️ Deployment Plan

```
Your PC (Windows)
   │
   ├── 1. Build React → dist/ folder (saves RAM on server)
   ├── 2. Push code to GitHub
   │
   ▼
AWS EC2 t2.micro (Ubuntu 22.04)
   │
   ├── Nginx (port 80)
   │     ├── /       → serves dist/ (static React)
   │     └── /api/   → proxy → Node.js :3001
   │                              └── proxy → Python FastAPI :8000
   │
   ├── Node.js Express (port 3001) via PM2
   └── Python FastAPI  (port 8000) via PM2
```

---

## Phase 1 — Prepare on Your Local PC (Windows)

### Step 1.1 — Build the Frontend Locally

> Building locally means the server **never needs Node.js RAM for building** — only for running Express.

Open PowerShell in your project folder:

```powershell
cd "C:\Users\Sahil Patil\Desktop\DocLib\frontend"
npm install
npm run build
```

This creates `frontend/dist/` — the static files Nginx will serve directly.

---

### Step 1.2 — Push Project to GitHub

> This is the easiest way to get your code onto EC2.

```powershell
cd "C:\Users\Sahil Patil\Desktop\DocLib"

# If not already a git repo with remote, do:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Make sure dist/ is NOT in .gitignore (we want to upload the built files)
# Check .gitignore — if dist is listed, remove it:
# Open .gitignore and delete the line "dist" from the frontend section

git add .
git commit -m "production build ready"
git push origin main
```

> [!IMPORTANT]
> Make sure your `.gitignore` does **not** exclude `frontend/dist`. We need those built files on the server. The `node_modules/`, `venv/`, and `__pycache__/` should still be ignored.

---

## Phase 2 — AWS Setup

### Step 2.1 — Launch EC2 Instance

1. Go to [AWS EC2 Console](https://console.aws.amazon.com/ec2/) → **Launch Instance**

2. Fill in:
   - **Name**: `contexa`
   - **AMI**: `Ubuntu Server 22.04 LTS (HVM), SSD Volume Type` *(Free tier eligible)*
   - **Instance type**: `t2.micro` *(Free tier eligible — 1 vCPU, 1 GiB RAM)*
   - **Key pair**: Click **Create new key pair**
     - Name: `contexa-key`
     - Type: RSA
     - Format: `.pem`
     - **Download it** → Save to `C:\Users\Sahil Patil\contexa-key.pem`

3. **Network settings** → Click **Edit** → Add these inbound rules:

| Rule | Protocol | Port | Source |
|------|----------|------|--------|
| SSH | TCP | 22 | **My IP** (auto-fills your IP) |
| HTTP | TCP | 80 | `0.0.0.0/0` |

4. **Storage**: Set to **20 GB** gp2 *(Free tier gives up to 30 GB)*

5. Click **Launch Instance** → wait 1-2 minutes for it to start

6. Go to **Instances** → copy your **Public IPv4 address** (e.g. `54.123.45.67`)

---

### Step 2.2 — Connect via SSH

Open **PowerShell** on your PC:

```powershell
# Fix key permissions (Windows requires this)
icacls "C:\Users\Sahil Patil\contexa-key.pem" /inheritance:r /grant:r "$($env:USERNAME):(R)"

# Connect (replace with your actual IP)
ssh -i "C:\Users\Sahil Patil\contexa-key.pem" ubuntu@54.123.45.67
```

You should see a Ubuntu welcome banner. You are now on the server. ✅

---

## Phase 3 — Server Setup (All commands run on EC2)

### Step 3.1 — Add a 4 GB Swap File (CRITICAL for Free Tier)

> Without this, Python + ChromaDB + sentence-transformers will **crash** the 1 GB RAM instance.

```bash
# Create 4 GB swap file
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make swap permanent (survives reboots)
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Tune swap usage (only use swap when RAM is almost full)
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Verify (should show 4GB swap)
free -h
```

Expected output:
```
              total    used    free
Mem:          985Mi   ...
Swap:         4.0Gi   0B      4.0Gi
```

---

### Step 3.2 — Update System & Install Essentials

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget build-essential software-properties-common
```

---

### Step 3.3 — Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v    # v20.x.x ✅
npm -v     # 10.x.x  ✅
```

---

### Step 3.4 — Install Python 3.11

```bash
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev
python3.11 --version   # Python 3.11.x ✅
```

---

### Step 3.5 — Install Nginx & PM2

```bash
# Nginx (web server / reverse proxy)
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# PM2 (keeps Node.js and Python running forever)
sudo npm install -g pm2
pm2 -v   # 5.x.x ✅
```

---

## Phase 4 — Deploy Your Application

### Step 4.1 — Clone Your Repository

```bash
cd /home/ubuntu
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git app
cd app
ls    # should see: frontend/ backend/ ai-service/ config/ .env.example
```

---

### Step 4.2 — Create Environment Files

**Backend `.env`:**
```bash
cp .env.example backend/.env
nano backend/.env
```

Replace contents with:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
JWT_SECRET=replace_this_with_any_long_random_string_abc123xyz789
PORT=3001
NODE_ENV=production
AI_SERVICE_URL=http://localhost:8000
FRONTEND_URL=http://54.123.45.67
```

Save: `Ctrl+O` → `Enter` → `Ctrl+X`

**AI Service `.env`:**
```bash
cp .env.example ai-service/.env
nano ai-service/.env
```

Replace contents with:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

Save: `Ctrl+O` → `Enter` → `Ctrl+X`

---

### Step 4.3 — Install Backend Dependencies

```bash
cd /home/ubuntu/app/backend
npm install --omit=dev
```

---

### Step 4.4 — Install Python Dependencies

> [!WARNING]
> This step downloads ~700MB of data (sentence-transformers model weights). It will take **5-10 minutes** on a new instance. Do NOT cancel it.

```bash
cd /home/ubuntu/app/ai-service
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
```

---

## Phase 5 — Configure Nginx

### Step 5.1 — Create Nginx Site Config

```bash
sudo nano /etc/nginx/sites-available/contexa
```

Paste this exactly (replace `54.123.45.67` with your EC2 Public IP):

```nginx
server {
    listen 80;
    server_name 54.123.45.67;

    # Allow large file uploads (PDF, DOCX etc up to 55MB)
    client_max_body_size 55M;

    # Serve the React build (static files)
    location / {
        root /home/ubuntu/app/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to Node.js Express backend
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;

        # IMPORTANT: Disable buffering for streaming / SSE responses
        proxy_buffering off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

Save: `Ctrl+O` → `Enter` → `Ctrl+X`

### Step 5.2 — Enable the Site

```bash
# Enable our site
sudo ln -s /etc/nginx/sites-available/contexa /etc/nginx/sites-enabled/

# Disable the default placeholder site
sudo rm -f /etc/nginx/sites-enabled/default

# Test the config (must say "syntax is ok")
sudo nginx -t

# Apply changes
sudo systemctl reload nginx
```

---

## Phase 6 — Start All Services with PM2

### Step 6.1 — Create PM2 Config

```bash
cd /home/ubuntu/app
nano ecosystem.config.js
```

Paste:

```js
module.exports = {
  apps: [
    {
      name: 'contexa-backend',
      cwd: '/home/ubuntu/app/backend',
      script: 'src/index.js',
      interpreter: 'node',
      max_memory_restart: '400M',   // restart if Node.js uses > 400MB RAM
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'contexa-ai',
      cwd: '/home/ubuntu/app/ai-service',
      script: 'main.py',
      interpreter: '/home/ubuntu/app/ai-service/venv/bin/python3',
      max_memory_restart: '600M',   // restart if Python uses > 600MB RAM
      env: {
        PORT: '8000',
      },
    },
  ],
};
```

Save: `Ctrl+O` → `Enter` → `Ctrl+X`

### Step 6.2 — Start Services

```bash
pm2 start ecosystem.config.js

# Check they are running (status should be "online")
pm2 list
```

Expected output:
```
┌────┬─────────────────────┬─────────┬───────┬──────┬─────────┐
│ id │ name                │ status  │ cpu   │ mem  │ ...     │
├────┼─────────────────────┼─────────┼───────┼──────┼─────────┤
│ 0  │ contexa-backend     │ online  │ 0%    │ 80mb │         │
│ 1  │ contexa-ai          │ online  │ 0%    │ 200mb│         │
└────┴─────────────────────┴─────────┴───────┴──────┴─────────┘
```

### Step 6.3 — Auto-start on Reboot

```bash
pm2 save
pm2 startup

# PM2 will print a command — copy and run it. It looks like:
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

Run the command it prints, then:
```bash
pm2 save
```

---

## Phase 7 — Test Your Deployment

```bash
# 1. Check Node.js backend is responding
curl http://localhost:3001/health

# 2. Check Python AI service is responding
curl http://localhost:8000/health

# 3. Check Nginx is serving the site
curl -I http://localhost
```

Now open your browser and go to:
```
http://54.123.45.67
```

You should see the Contexa login page! 🎉

---

## 🔄 How to Redeploy After Code Changes

```bash
cd /home/ubuntu/app

# Pull latest code
git pull

# If backend changed:
cd backend && npm install --omit=dev && cd ..
pm2 restart contexa-backend

# If AI service changed:
cd ai-service && source venv/bin/activate && pip install -r requirements.txt && deactivate && cd ..
pm2 restart contexa-ai

# If frontend changed (build locally first, then push to git, then pull here)
pm2 reload contexa-backend   # not needed for frontend
sudo nginx -s reload          # not needed unless nginx config changed
```

---

## 🔧 Common Issues & Fixes

| Problem | Cause | Fix |
|---------|-------|-----|
| Site not loading | Nginx config wrong | `sudo nginx -t` to check errors |
| `contexa-ai` crashes on start | Out of memory | Swap not set up → re-do Step 3.1 |
| `pm2 list` shows `errored` | Code error / missing `.env` | `pm2 logs contexa-ai --lines 50` |
| Login fails / 401 errors | Wrong `JWT_SECRET` in `.env` | Check `backend/.env`, restart PM2 |
| File upload fails (413) | Nginx body size limit | Already set `client_max_body_size 55M` |
| CORS error in browser | `FRONTEND_URL` wrong | Set exact IP in `backend/.env`, restart PM2 |
| SSH disconnects during pip install | Connection timeout | Use `nohup pip install ... &` or `tmux` |

---

## 📋 Useful Commands Cheatsheet

```bash
# See all running services + memory usage
pm2 list
pm2 monit          # live real-time dashboard

# View logs
pm2 logs           # all services
pm2 logs contexa-backend --lines 100
pm2 logs contexa-ai --lines 100

# Restart / stop
pm2 restart all
pm2 restart contexa-ai
pm2 stop all

# Check memory / swap
free -h
top               # press q to exit

# Check Nginx
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log

# Check disk usage (free tier has 20GB)
df -h
```

---

## 💰 Free Tier Cost Breakdown

| Resource | Free Tier Allowance | Your Usage |
|----------|---------------------|------------|
| EC2 t2.micro | 750 hrs/month (1 instance = always on) | **$0.00** |
| EBS Storage | 30 GB/month | **$0.00** (using 20 GB) |
| Data Transfer Out | 100 GB/month | **$0.00** |
| **Total** | | **$0.00 / month** ✅ |

> [!NOTE]
> Free tier is valid for **12 months** from your AWS account creation date. After 12 months, t2.micro costs ~$8.50/month.
