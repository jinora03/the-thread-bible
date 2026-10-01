import { SectionHeading } from '@/components/typography/section-heading'
import { ConnectionThread } from '@/features/connections/connection-thread'
import type { Thread } from '@shared/types/connections'

/** A chain-reference trail: passage to passage, so the reader can follow the thread through Scripture. */
export function ThreadSection({ thread, id = 'thread' }: { thread: Thread; id?: string }) {
  return (
    <section aria-labelledby={id}>
      <SectionHeading
        id={id}
        eyebrow={<p className="eyebrow">Follow the thread</p>}
        title={thread.title}
        description="Each step is a passage. Choose a reference to read it in place."
      />
      <div className="mt-8">
        <ConnectionThread thread={thread} orientation="vertical" />
      </div>
    </section>
  )
}
