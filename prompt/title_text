You are given a task to integrate an existing React component in the codebase

The codebase should support:
- shadcn project structure  
- Tailwind CSS
- Typescript

If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:
```tsx
text-block-animation.tsx
"use client"

import gsap from "gsap"
import { SplitText } from "gsap/SplitText"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"
import { useRef } from "react"
import { cn } from "@/lib/utils";

// Ensure plugins are registered
gsap.registerPlugin(SplitText, ScrollTrigger);

export default function TextBlockAnimation({
    children,
    animateOnScroll = true,
    delay = 0,
    blockColor = "#000",
    stagger = 0.1, // Reduced for smoother flow
    duration = 0.6 // Slightly faster for snappiness
}) {
    const containerRef = useRef(null);

    useGSAP(() => {
        if (!containerRef.current) return;

        // 1. Setup SplitText
        const split = new SplitText(containerRef.current, {
            type: "lines",
            linesClass: "block-line-parent", // Generic class for styling if needed
        });

        // 2. Wrap lines and inject the block revealer manually
        // We do this to avoid layout thrashing by doing it in one pass
        const lines = split.lines;
        const blocks = [];

        lines.forEach((line) => {
            // Create the wrapper (clip-path logic often works better, but we stick to your block logic)
            const wrapper = document.createElement("div");
            wrapper.style.position = "relative";
            wrapper.style.display = "block";
            wrapper.style.overflow = "hidden"; // Ensures text doesn't show outside
            
            // Create the Revealer Block
            const block = document.createElement("div");
            block.style.position = "absolute";
            block.style.top = "0";
            block.style.left = "0";
            block.style.width = "100%";
            block.style.height = "100%";
            block.style.backgroundColor = blockColor;
            block.style.zIndex = "2";
            block.style.transform = "scaleX(0)";
            block.style.transformOrigin = "left center";
            
            // Insert wrapper and move line inside
            line.parentNode.insertBefore(wrapper, line);
            wrapper.appendChild(line);
            wrapper.appendChild(block);
            
            // Set initial state of line to invisible
            gsap.set(line, { opacity: 0 });
            
            blocks.push(block);
        });

        // 3. Create the Master Timeline
        const tl = gsap.timeline({
            defaults: { ease: "expo.inOut" },
            scrollTrigger: animateOnScroll ? {
                trigger: containerRef.current,
                start: "top 85%", // Triggers when top of element hits 85% viewport height
                toggleActions: "play none none reverse", // Replays if you scroll back up
            } : null,
            delay: delay
        });

        // 4. Build the Animation Sequence
        // Step A: Scale Block 0 -> 1 (Left to Right)
        tl.to(blocks, {
            scaleX: 1,
            duration: duration,
            stagger: stagger,
            transformOrigin: "left center",
        })
        // Step B: Reveal Text (Instant)
        .set(lines, {
            opacity: 1,
            stagger: stagger
        }, `<${duration / 2}`) // Start revealing halfway through the block expansion
        // Step C: Scale Block 1 -> 0 (Left to Right)
        .to(blocks, {
            scaleX: 0,
            duration: duration,
            stagger: stagger,
            transformOrigin: "right center"
        }, `<${duration * 0.4}`); // Overlap significantly with the entry

    }, { 
        scope: containerRef, 
        dependencies: [animateOnScroll, delay, blockColor, stagger, duration] 
    });
    
    return (
        <div ref={containerRef} style={{ position: "relative" }}>
            {children}
        </div>
    );
}

demo.tsx
import TextBlockAnimation from "@/components/ui/text-block-animation";
import { ArrowDown } from "lucide-react";

export default function DemoOne() {
  return (
    <div className="min-h-screen w-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 flex flex-col">
      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col">

        {/* 1. HERO SECTION: The Hook */}
        <section className="min-h-screen flex flex-col items-center justify-center relative px-6">
          <div className="max-w-4xl w-full">
            <TextBlockAnimation
              blockColor="#6366f1" // Indigo
              animateOnScroll={false}
              delay={0.2}
              duration={0.8}
            >
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-tight">
                Don&apos;t just inform.<br />
                <span className="inline-block bg-black text-white dark:bg-white dark:text-black px-3 pb-1 rounded-md mt-2">
    Captivate.
  </span>
              </h1>
            </TextBlockAnimation>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-12 flex flex-col items-center gap-2 opacity-60">
  <span className="text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
    Scroll to Reveal
  </span>
  <ArrowDown className="w-5 h-5 text-zinc-500 dark:text-zinc-400 animate-bounce" />
</div>

        </section>

        {/* 2. THE PITCH */}
        <section className="min-h-[80vh] flex flex-col justify-center items-center px-6 py-24 bg-zinc-100/80 dark:bg-zinc-900/60">
          <div className="max-w-3xl w-full space-y-16">
            <TextBlockAnimation blockColor="#10b981" duration={0.7}>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
                This is what I do.
              </h2>
            </TextBlockAnimation>

            <TextBlockAnimation blockColor="#f59e0b" stagger={0.03}>
              <p className="text-lg md:text-2xl leading-relaxed text-zinc-700 dark:text-zinc-300">
                You stopped scrolling because the motion caught your eye.
                That&apos;s the power of <strong>GSAP</strong> and <strong>React</strong> properly combined.
                I build bespoke animations like this for clients who aren&apos;t satisfied with &quot;standard.&quot;
              </p>
            </TextBlockAnimation>

            <div className="pl-6 border-l-2 border-indigo-500 dark:border-indigo-400">
              <TextBlockAnimation blockColor="#ffffff" duration={0.6}>
                <p className="text-base md:text-lg italic text-zinc-500 dark:text-zinc-400">
                  &quot;If you want your website to feel alive, we should talk.&quot;
                </p>
              </TextBlockAnimation>
            </div>
          </div>
        </section>

        {/* 3. FOOTER: Call to Action */}
        <footer className="h-[40vh] md:h-[50vh] flex items-center justify-center border-t border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-950">
          <TextBlockAnimation blockColor="#ef4444" duration={0.8}>
            <a
              href="mailto:hello@daiwiik.com"
              className="text-4xl md:text-6xl lg:text-7xl font-black hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Let&apos;s Build It.
            </a>
          </TextBlockAnimation>
        </footer>
      </div>
    </div>
  );
}

```

Install NPM dependencies:
```bash
gsap, @gsap/react
```

Implementation Guidelines
 1. Analyze the component structure and identify all required dependencies
 2. Review the component's argumens and state
 3. Identify any required context providers or hooks and install them
 4. Questions to Ask
 - What data/props will be passed to this component?
 - Are there any specific state management requirements?
 - Are there any required assets (images, icons, etc.)?
 - What is the expected responsive behavior?
 - What is the best place to use this component in the app?

Steps to integrate
 0. Copy paste all the code above in the correct directories
 1. Install external dependencies
 2. Fill image assets with Unsplash stock images you know exist
 3. Use lucide-react icons for svgs or logos if component requires them
