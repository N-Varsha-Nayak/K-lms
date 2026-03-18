import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function getOrCreateSubject(course) {
  const slug = slugify(course.title);
  const [rows] = await pool.execute(
    'SELECT id FROM subjects WHERE slug = ? OR title = ? LIMIT 1',
    [slug, course.title]
  );

  if (rows.length > 0) {
    const subjectId = Number(rows[0].id);
    await pool.execute(
      `
        UPDATE subjects
        SET
          slug = ?,
          title = ?,
          description = ?,
          short_description = ?,
          category = ?,
          level = ?,
          pricing_tier = ?,
          price_inr = ?,
          instructor_name = ?,
          thumbnail_url = ?,
          rating = ?,
          enrolled_count = ?,
          estimated_hours = ?
        WHERE id = ?
      `,
      [
        slug,
        course.title,
        course.description,
        course.short_description,
        course.category,
        course.level,
        course.pricing_tier,
        course.price_inr,
        course.instructor_name,
        course.thumbnail_url ?? null,
        course.rating,
        course.enrolled_count,
        course.estimated_hours,
        subjectId
      ]
    );
    return subjectId;
  }

  const [result] = await pool.execute(
    `
      INSERT INTO subjects (
        slug,
        title,
        description,
        short_description,
        category,
        level,
        pricing_tier,
        price_inr,
        instructor_name,
        thumbnail_url,
        rating,
        enrolled_count,
        estimated_hours
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      slug,
      course.title,
      course.description,
      course.short_description,
      course.category,
      course.level,
      course.pricing_tier,
      course.price_inr,
      course.instructor_name,
      course.thumbnail_url ?? null,
      course.rating,
      course.enrolled_count,
      course.estimated_hours
    ]
  );

  return Number(result.insertId);
}

async function seedSection(subjectId, title, orderIndex, videos) {
  const [existing] = await pool.execute(
    'SELECT id FROM sections WHERE subject_id = ? AND order_index = ? LIMIT 1',
    [subjectId, orderIndex]
  );

  let sectionId;
  if (existing.length > 0) {
    sectionId = Number(existing[0].id);
    await pool.execute('UPDATE sections SET title = ? WHERE id = ?', [title, sectionId]);
  } else {
    const [inserted] = await pool.execute(
      'INSERT INTO sections (subject_id, title, order_index) VALUES (?, ?, ?)',
      [subjectId, title, orderIndex]
    );
    sectionId = Number(inserted.insertId);
  }

  for (const video of videos) {
    const [videoExisting] = await pool.execute(
      'SELECT id FROM videos WHERE section_id = ? AND order_index = ? LIMIT 1',
      [sectionId, video.order_index]
    );

    if (videoExisting.length > 0) {
      await pool.execute(
        `
          UPDATE videos
          SET title = ?, description = ?, youtube_url = ?, duration_seconds = ?
          WHERE id = ?
        `,
        [video.title, video.description, video.youtube_url, video.duration_seconds, videoExisting[0].id]
      );
      continue;
    }

    await pool.execute(
      `
        INSERT INTO videos (section_id, title, description, youtube_url, order_index, duration_seconds)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        sectionId,
        video.title,
        video.description,
        video.youtube_url,
        video.order_index,
        video.duration_seconds
      ]
    );
  }
}

async function seedCourse(course) {
  const subjectId = await getOrCreateSubject(course);

  for (const section of course.sections) {
    await seedSection(subjectId, section.title, section.order_index, section.videos);
  }
}

const courses = [
  {
    title: 'Web Development Foundations',
    short_description: 'HTML, CSS, JavaScript, and responsive layout basics for beginners.',
    description: 'Build a strong frontend base with practical lessons on web structure, styling, and browser fundamentals.',
    category: 'Web Development',
    level: 'Beginner',
    pricing_tier: 'free',
    price_inr: 0,
    instructor_name: 'Aarav Mehta',
    rating: 4.7,
    enrolled_count: 18420,
    estimated_hours: 8.5,
    sections: [
      {
        title: 'Web Basics',
        order_index: 1,
        videos: [
          {
            title: 'How the Web Works',
            description: 'Understand browsers, servers, DNS, and HTTP in simple terms.',
            youtube_url: 'https://www.youtube.com/watch?v=7_LPdttKXPc',
            order_index: 1,
            duration_seconds: 640
          },
          {
            title: 'Semantic HTML Essentials',
            description: 'Learn structure, accessibility, and content hierarchy.',
            youtube_url: 'https://www.youtube.com/watch?v=qz0aGYrrlhU',
            order_index: 2,
            duration_seconds: 1800
          }
        ]
      },
      {
        title: 'Styling and Interactivity',
        order_index: 2,
        videos: [
          {
            title: 'Modern CSS Layouts',
            description: 'Use flexbox, grid, and spacing systems effectively.',
            youtube_url: 'https://www.youtube.com/watch?v=OEV8gMkCHXQ',
            order_index: 1,
            duration_seconds: 420
          },
          {
            title: 'JavaScript Fundamentals',
            description: 'Variables, functions, arrays, and browser events.',
            youtube_url: 'https://www.youtube.com/watch?v=DHjqpvDnNGE',
            order_index: 2,
            duration_seconds: 780
          }
        ]
      }
    ]
  },
  {
    title: 'Python for Data Analysis',
    short_description: 'Use Python, NumPy, and pandas to clean and explore data.',
    description: 'A beginner-friendly path into analysis workflows, notebooks, and practical data storytelling.',
    category: 'Data Science',
    level: 'Beginner',
    pricing_tier: 'free',
    price_inr: 0,
    instructor_name: 'Nisha Reddy',
    rating: 4.8,
    enrolled_count: 15670,
    estimated_hours: 9.0,
    sections: [
      {
        title: 'Data Foundations',
        order_index: 1,
        videos: [
          {
            title: 'Python for Data Workflows',
            description: 'See where Python fits across analysis and reporting.',
            youtube_url: 'https://www.youtube.com/watch?v=LHBE6Q9XlzI',
            order_index: 1,
            duration_seconds: 620
          },
          {
            title: 'NumPy Fast Start',
            description: 'Arrays, vectorization, and numerical thinking.',
            youtube_url: 'https://www.youtube.com/watch?v=xECXZ3tyONo',
            order_index: 2,
            duration_seconds: 320
          }
        ]
      },
      {
        title: 'Cleaning and Visualizing',
        order_index: 2,
        videos: [
          {
            title: 'Pandas Core Patterns',
            description: 'Select, group, sort, and transform tabular data.',
            youtube_url: 'https://www.youtube.com/watch?v=vmEHCJofslg',
            order_index: 1,
            duration_seconds: 600
          },
          {
            title: 'Communicating Insights',
            description: 'Build clear charts and explain trends with confidence.',
            youtube_url: 'https://www.youtube.com/watch?v=UO98lJQ3QGI',
            order_index: 2,
            duration_seconds: 720
          }
        ]
      }
    ]
  },
  {
    title: 'UI/UX Design Fundamentals',
    short_description: 'Design cleaner interfaces and improve usability decisions.',
    description: 'Learn layout, typography, user flows, and feedback loops used in modern product teams.',
    category: 'Design',
    level: 'Beginner',
    pricing_tier: 'free',
    price_inr: 0,
    instructor_name: 'Sara Khan',
    rating: 4.6,
    enrolled_count: 11280,
    estimated_hours: 6.5,
    sections: [
      {
        title: 'Visual Design Core',
        order_index: 1,
        videos: [
          {
            title: 'Design Principles for Beginners',
            description: 'Contrast, hierarchy, proximity, and consistency.',
            youtube_url: 'https://www.youtube.com/watch?v=_Hp_dI0DzY4',
            order_index: 1,
            duration_seconds: 840
          },
          {
            title: 'Typography for Product Screens',
            description: 'Improve readability and establish visual rhythm.',
            youtube_url: 'https://www.youtube.com/watch?v=sByzHoiYFX0',
            order_index: 2,
            duration_seconds: 510
          }
        ]
      },
      {
        title: 'Usability Workflow',
        order_index: 2,
        videos: [
          {
            title: 'Wireframes and User Flows',
            description: 'Move from ideas to usable journeys quickly.',
            youtube_url: 'https://www.youtube.com/watch?v=qpH7-KFWZRI',
            order_index: 1,
            duration_seconds: 900
          },
          {
            title: 'Usability Testing Basics',
            description: 'Gather meaningful feedback and iterate on findings.',
            youtube_url: 'https://www.youtube.com/watch?v=3Qg80X7jQVU',
            order_index: 2,
            duration_seconds: 630
          }
        ]
      }
    ]
  },
  {
    title: 'AI Literacy for Professionals',
    short_description: 'Understand modern AI systems, prompting, and practical workplace usage.',
    description: 'A concise entry point to generative AI, responsible use, and applying automation in real teams.',
    category: 'AI & Automation',
    level: 'Beginner',
    pricing_tier: 'free',
    price_inr: 0,
    instructor_name: 'Rohan Iyer',
    rating: 4.7,
    enrolled_count: 13940,
    estimated_hours: 5.5,
    sections: [
      {
        title: 'AI Concepts',
        order_index: 1,
        videos: [
          {
            title: 'What Generative AI Actually Does',
            description: 'Models, tokens, training, and common misconceptions.',
            youtube_url: 'https://www.youtube.com/watch?v=2IK3DFHRFfw',
            order_index: 1,
            duration_seconds: 540
          },
          {
            title: 'Prompting for Better Outputs',
            description: 'Structure prompts for analysis, writing, and planning.',
            youtube_url: 'https://www.youtube.com/watch?v=jC4v5AS4RIM',
            order_index: 2,
            duration_seconds: 480
          }
        ]
      },
      {
        title: 'Responsible Application',
        order_index: 2,
        videos: [
          {
            title: 'Evaluating AI Responses',
            description: 'Spot hallucinations and verify claims before acting.',
            youtube_url: 'https://www.youtube.com/watch?v=JTxsNm9IdYU',
            order_index: 1,
            duration_seconds: 610
          },
          {
            title: 'AI Workflows at Work',
            description: 'Use AI to summarize, brainstorm, and accelerate repetitive tasks.',
            youtube_url: 'https://www.youtube.com/watch?v=MlP0nvJSshU',
            order_index: 2,
            duration_seconds: 530
          }
        ]
      }
    ]
  },
  {
    title: 'Git and GitHub Essentials',
    short_description: 'Learn version control, branching, pull requests, and collaboration basics.',
    description: 'Start using Git confidently for personal work, team collaboration, and portfolio-ready workflows.',
    category: 'Developer Tools',
    level: 'Beginner',
    pricing_tier: 'free',
    price_inr: 0,
    instructor_name: 'Kabir Patel',
    rating: 4.8,
    enrolled_count: 12810,
    estimated_hours: 4.5,
    sections: [
      {
        title: 'Version Control Basics',
        order_index: 1,
        videos: [
          {
            title: 'Git Concepts in Plain English',
            description: 'Repositories, commits, staging, and history.',
            youtube_url: 'https://www.youtube.com/watch?v=RGOj5yH7evk',
            order_index: 1,
            duration_seconds: 760
          },
          {
            title: 'Branching and Merging',
            description: 'Work safely on features and resolve conflicts.',
            youtube_url: 'https://www.youtube.com/watch?v=FyAAIHHClqI',
            order_index: 2,
            duration_seconds: 540
          }
        ]
      },
      {
        title: 'Collaboration on GitHub',
        order_index: 2,
        videos: [
          {
            title: 'Pull Requests and Reviews',
            description: 'Ship code with feedback loops and clean history.',
            youtube_url: 'https://www.youtube.com/watch?v=8lGpZkjnkt4',
            order_index: 1,
            duration_seconds: 610
          },
          {
            title: 'Portfolio-Ready Open Source Workflow',
            description: 'Forks, issues, and contribution etiquette.',
            youtube_url: 'https://www.youtube.com/watch?v=nT8KGYVurIU',
            order_index: 2,
            duration_seconds: 500
          }
        ]
      }
    ]
  },
  {
    title: 'Full-Stack React Career Track',
    short_description: 'Build production-grade apps with React, Next.js, APIs, and deployment.',
    description: 'A premium path for developers who want a real project workflow from frontend to backend delivery.',
    category: 'Web Development',
    level: 'Intermediate',
    pricing_tier: 'premium',
    price_inr: 2199,
    instructor_name: 'Ishaan Verma',
    rating: 4.9,
    enrolled_count: 9420,
    estimated_hours: 24.0,
    sections: [
      {
        title: 'React Architecture',
        order_index: 1,
        videos: [
          {
            title: 'Component Systems That Scale',
            description: 'Design maintainable React apps with predictable state.',
            youtube_url: 'https://www.youtube.com/watch?v=Tn6-PIqc4UM',
            order_index: 1,
            duration_seconds: 840
          },
          {
            title: 'React Hooks and Data Flows',
            description: 'Compose state, effects, and side effects without chaos.',
            youtube_url: 'https://www.youtube.com/watch?v=TNhaISOUy6Q',
            order_index: 2,
            duration_seconds: 930
          }
        ]
      },
      {
        title: 'Next.js and Delivery',
        order_index: 2,
        videos: [
          {
            title: 'App Router Patterns',
            description: 'Server components, client components, and route structure.',
            youtube_url: 'https://www.youtube.com/watch?v=Sklc_fQBmcs',
            order_index: 1,
            duration_seconds: 720
          },
          {
            title: 'Deploying Full-Stack Apps',
            description: 'Move from local development to real production hosting.',
            youtube_url: 'https://www.youtube.com/watch?v=9FnYq5JQfdo',
            order_index: 2,
            duration_seconds: 780
          }
        ]
      }
    ]
  },
  {
    title: 'Data Science Bootcamp',
    short_description: 'Statistics, Python workflows, machine learning, and applied projects.',
    description: 'A structured premium program for analysts and aspiring data scientists building job-ready depth.',
    category: 'Data Science',
    level: 'Intermediate',
    pricing_tier: 'premium',
    price_inr: 2499,
    instructor_name: 'Meera Sethi',
    rating: 4.9,
    enrolled_count: 8160,
    estimated_hours: 28.0,
    sections: [
      {
        title: 'Analysis Foundations',
        order_index: 1,
        videos: [
          {
            title: 'Exploratory Data Analysis Workflow',
            description: 'Frame questions, inspect data, and surface patterns quickly.',
            youtube_url: 'https://www.youtube.com/watch?v=xi0vhXFPegw',
            order_index: 1,
            duration_seconds: 860
          },
          {
            title: 'Statistics for Data Decisions',
            description: 'Distributions, significance, and confidence intervals.',
            youtube_url: 'https://www.youtube.com/watch?v=xxpc-HPKN28',
            order_index: 2,
            duration_seconds: 920
          }
        ]
      },
      {
        title: 'Machine Learning Path',
        order_index: 2,
        videos: [
          {
            title: 'Supervised Learning Foundations',
            description: 'Train, validate, and evaluate predictive models.',
            youtube_url: 'https://www.youtube.com/watch?v=7eh4d6sabA0',
            order_index: 1,
            duration_seconds: 870
          },
          {
            title: 'Feature Engineering in Practice',
            description: 'Improve model signal with robust data preparation.',
            youtube_url: 'https://www.youtube.com/watch?v=N9fDIAflCMY',
            order_index: 2,
            duration_seconds: 690
          }
        ]
      }
    ]
  },
  {
    title: 'DevOps and Cloud Engineering',
    short_description: 'Containers, CI/CD, cloud architecture, and deployment automation.',
    description: 'A premium engineering path for building, shipping, and operating modern applications reliably.',
    category: 'Cloud & DevOps',
    level: 'Intermediate',
    pricing_tier: 'premium',
    price_inr: 2399,
    instructor_name: 'Dev Malik',
    rating: 4.8,
    enrolled_count: 7710,
    estimated_hours: 22.5,
    sections: [
      {
        title: 'Infrastructure and Containers',
        order_index: 1,
        videos: [
          {
            title: 'Cloud Architecture Essentials',
            description: 'Learn core cloud building blocks and service tradeoffs.',
            youtube_url: 'https://www.youtube.com/watch?v=2LaAJq1lB1Q',
            order_index: 1,
            duration_seconds: 720
          },
          {
            title: 'Docker for Application Teams',
            description: 'Containerize services and keep environments predictable.',
            youtube_url: 'https://www.youtube.com/watch?v=Gjnup-PuquQ',
            order_index: 2,
            duration_seconds: 420
          }
        ]
      },
      {
        title: 'Automation and Scale',
        order_index: 2,
        videos: [
          {
            title: 'CI/CD Pipelines that Matter',
            description: 'Automate test, build, and deploy stages responsibly.',
            youtube_url: 'https://www.youtube.com/watch?v=scEDHsr3APg',
            order_index: 1,
            duration_seconds: 600
          },
          {
            title: 'Kubernetes Mental Model',
            description: 'Understand orchestration, services, and workloads.',
            youtube_url: 'https://www.youtube.com/watch?v=PziYflu8cB8',
            order_index: 2,
            duration_seconds: 560
          }
        ]
      }
    ]
  },
  {
    title: 'Product Management Accelerator',
    short_description: 'Roadmaps, user research, prioritization, and product execution.',
    description: 'A premium product track focused on shipping with clarity, metrics, and better cross-functional communication.',
    category: 'Business',
    level: 'Intermediate',
    pricing_tier: 'premium',
    price_inr: 1999,
    instructor_name: 'Dr. Nancy Li',
    rating: 4.7,
    enrolled_count: 6480,
    estimated_hours: 16.0,
    sections: [
      {
        title: 'Product Thinking',
        order_index: 1,
        videos: [
          {
            title: 'Finding Real User Problems',
            description: 'Turn interviews and observation into sharper product direction.',
            youtube_url: 'https://www.youtube.com/watch?v=Uk_AJMhIkZY',
            order_index: 1,
            duration_seconds: 640
          },
          {
            title: 'Prioritization Without Guessing',
            description: 'Use impact and effort frameworks responsibly.',
            youtube_url: 'https://www.youtube.com/watch?v=502ILHjX9EE',
            order_index: 2,
            duration_seconds: 520
          }
        ]
      },
      {
        title: 'Execution and Metrics',
        order_index: 2,
        videos: [
          {
            title: 'Writing Strong Product Specs',
            description: 'Align design, engineering, and stakeholders early.',
            youtube_url: 'https://www.youtube.com/watch?v=0JAd0aW_vfU',
            order_index: 1,
            duration_seconds: 580
          },
          {
            title: 'Metrics That Drive Decisions',
            description: 'Choose meaningful KPIs and interpret them properly.',
            youtube_url: 'https://www.youtube.com/watch?v=7m3dEhWvT2Y',
            order_index: 2,
            duration_seconds: 610
          }
        ]
      }
    ]
  },
  {
    title: 'Cybersecurity Analyst Path',
    short_description: 'Threat basics, network security, incident response, and defensive thinking.',
    description: 'A premium security track for learners who want practical fundamentals without losing sight of risk management.',
    category: 'Security',
    level: 'Intermediate',
    pricing_tier: 'premium',
    price_inr: 2599,
    instructor_name: 'Farhan Sheikh',
    rating: 4.8,
    enrolled_count: 5920,
    estimated_hours: 21.0,
    sections: [
      {
        title: 'Security Foundations',
        order_index: 1,
        videos: [
          {
            title: 'Cybersecurity Core Concepts',
            description: 'Threats, attack surfaces, controls, and defense in depth.',
            youtube_url: 'https://www.youtube.com/watch?v=inWWhr5tnEA',
            order_index: 1,
            duration_seconds: 740
          },
          {
            title: 'Networking for Security Analysts',
            description: 'Packets, protocols, ports, and suspicious traffic patterns.',
            youtube_url: 'https://www.youtube.com/watch?v=qiQR5rTSshw',
            order_index: 2,
            duration_seconds: 800
          }
        ]
      },
      {
        title: 'Detection and Response',
        order_index: 2,
        videos: [
          {
            title: 'Incident Response Workflow',
            description: 'Prepare, detect, contain, eradicate, and recover.',
            youtube_url: 'https://www.youtube.com/watch?v=dz7Ntp7KQGA',
            order_index: 1,
            duration_seconds: 680
          },
          {
            title: 'Security Logging and Monitoring',
            description: 'Use alerts, logs, and triage to investigate faster.',
            youtube_url: 'https://www.youtube.com/watch?v=J7z6J2tA1h0',
            order_index: 2,
            duration_seconds: 610
          }
        ]
      }
    ]
  }
];

async function main() {
  for (const course of courses) {
    await seedCourse(course);
  }

  const [[summary]] = await pool.query(
    `
      SELECT
        (SELECT COUNT(*) FROM subjects) AS subjects,
        (SELECT COUNT(*) FROM sections) AS sections,
        (SELECT COUNT(*) FROM videos) AS videos,
        (SELECT SUM(CASE WHEN pricing_tier = 'free' THEN 1 ELSE 0 END) FROM subjects) AS free_courses,
        (SELECT SUM(CASE WHEN pricing_tier = 'premium' THEN 1 ELSE 0 END) FROM subjects) AS premium_courses
    `
  );

  console.log(
    `Seed complete: subjects=${summary.subjects}, sections=${summary.sections}, videos=${summary.videos}, free=${summary.free_courses}, premium=${summary.premium_courses}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
