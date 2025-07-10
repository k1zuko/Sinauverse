# KahootClone - Interactive Learning Platform

Platform pembelajaran interaktif yang memungkinkan Anda membuat dan memainkan kuis secara real-time dengan teman, keluarga, atau rekan kerja.

## ✨ Fitur Utama

- 🎯 **Kuis Interaktif** - Buat kuis dengan berbagai jenis pertanyaan
- 👥 **Multiplayer Real-time** - Hingga 50 pemain dalam satu game
- 🏆 **Sistem Poin & Leaderboard** - Kompetisi yang seru dan menantang
- 📱 **Responsive Design** - Berfungsi di semua perangkat
- 🔐 **Authentication** - Sistem login yang aman dengan Supabase
- ⚡ **Real-time Updates** - Sinkronisasi langsung antar pemain

## 🚀 Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Database, Auth, Real-time)
- **Icons**: Lucide React

## 📦 Installation

1. **Clone repository**
   \`\`\`bash
   git clone https://github.com/yourusername/kahoot-clone.git
   cd kahoot-clone
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Setup environment variables**
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`
   
   Edit `.env.local` dan isi dengan kredensial Supabase Anda:
   \`\`\`env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   \`\`\`

4. **Setup database**
   
   Jalankan SQL scripts di Supabase SQL Editor sesuai urutan:
   \`\`\`bash
   # 1. Buat tables dan policies
   scripts/01-create-tables.sql
   
   # 2. Buat functions dan triggers
   scripts/02-create-functions.sql
   
   # 3. Insert demo data
   scripts/03-seed-data.sql
   \`\`\`

5. **Run development server**
   \`\`\`bash
   npm run dev
   \`\`\`

   Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

## 🎮 Cara Menggunakan

### Untuk Host (Pembuat Kuis)
1. **Daftar/Login** ke akun Anda
2. **Buat Kuis** dengan pertanyaan dan pilihan jawaban
3. **Mulai Game** dan bagikan kode room kepada pemain
4. **Kelola Game** dan lihat hasil real-time

### Untuk Pemain
1. **Kunjungi halaman Join Game**
2. **Masukkan kode room** yang diberikan host
3. **Pilih nickname** dan bergabung
4. **Jawab pertanyaan** dan lihat posisi di leaderboard

## 📁 Struktur Project

\`\`\`
kahoot-clone/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # User dashboard
│   ├── create/            # Quiz creation
│   ├── join/              # Join game
│   ├── play/              # Play quiz
│   ├── demo/              # Demo game
│   └── ...
├── components/            # Reusable components
│   ├── ui/               # shadcn/ui components
│   └── layout/           # Layout components
├── lib/                  # Utility libraries
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
├── scripts/              # Database SQL scripts
└── ...
\`\`\`

## 🔧 Development

### Available Scripts

\`\`\`bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript check
\`\`\`

### Database Schema

Project ini menggunakan Supabase dengan schema berikut:
- `profiles` - User profiles
- `quizzes` - Quiz data
- `questions` - Quiz questions
- `answer_options` - Answer choices
- `game_rooms` - Game sessions
- `game_participants` - Players in games
- `game_answers` - Player answers

## 🤝 Contributing

1. Fork repository
2. Buat feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Buat Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend as a Service
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Lucide](https://lucide.dev/) - Icon library

---

Made with ❤️ for interactive learning
