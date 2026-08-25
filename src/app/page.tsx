import { CosmicScene } from "./_components/CosmicScene";
import { NAME_LINES, ROLES } from "./_content";

/**
 * The visible headings are painted inside the canvas so the lens can bend them.
 * This copy stays in the document for screen readers and search engines, and is
 * what browsers without WebGL actually show.
 */
export default function Home() {
  return (
    <main className="relative min-h-full">
      <CosmicScene />

      <div className="dom-copy pointer-events-none fixed inset-0 grid place-items-center px-6">
        <div className="text-center">
          <h1 className="font-pixel text-[clamp(1.4rem,5vw,3.4rem)] leading-tight font-bold tracking-tight">
            {NAME_LINES.map((line, index) => (
              <span key={line} className="block">
                {index === 0 ? `${line} ` : line}
              </span>
            ))}
          </h1>
          <div className="mt-8 space-y-3">
            {ROLES.map((role) => (
              <p
                key={role}
                className="font-pixel text-[clamp(0.85rem,2.3vw,1.45rem)] tracking-[0.18em] uppercase"
              >
                {role}
              </p>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
