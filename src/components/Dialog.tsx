import * as RD from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'

export function Dialog({
  open,
  onOpenChange,
  title,
  children,
  wide = false,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  children: ReactNode
  /** 內容較多的面板（例如授權清單）用較寬的版面 */
  wide?: boolean
}) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="fixed inset-0 z-40 bg-[#26363355] backdrop-blur-[2px]" />
        <RD.Content
          aria-describedby={undefined}
          className={`fixed top-1/2 left-1/2 z-50 max-h-[90dvh] ${wide ? 'w-[min(720px,calc(100vw-32px))]' : 'w-[min(440px,calc(100vw-32px))]'} -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-(--radius-card) bg-paper p-6 shadow-card`}
        >
          <RD.Title className="mb-4 text-lg font-bold">{title}</RD.Title>
          {children}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  )
}
