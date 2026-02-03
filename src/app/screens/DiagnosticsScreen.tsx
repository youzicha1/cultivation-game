import { useState } from 'react'
import type { GameAction, GameState } from '../../engine'
import {
  getRawSaveFromStorage,
  importSaveFromRaw,
  CURRENT_SCHEMA,
  SAVE_KEY,
} from '../../engine'
import { APP_VERSION } from '../version'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
  clearSave: () => void
}

function getEnvelopeSummary(raw: string | null): { schemaVersion?: number; savedAt?: number; stateSummary?: string } {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as { meta?: { schemaVersion?: number; savedAt?: number }; state?: GameState }
    const meta = parsed?.meta
    const state = parsed?.state
    let stateSummary: string | undefined
    if (state && typeof state === 'object') {
      const s = state as GameState
      stateSummary = `screen=${s.screen} realm=${s.player?.realm ?? '?'} exp=${s.player?.exp ?? 0} turn=${s.run?.turn ?? 0} danger=${s.run?.danger ?? 0}`
    }
    return {
      schemaVersion: meta?.schemaVersion,
      savedAt: meta?.savedAt,
      stateSummary,
    }
  } catch {
    return {}
  }
}

export function DiagnosticsScreen({ state: _state, dispatch, clearSave }: ScreenProps) {
  const raw = getRawSaveFromStorage()
  const summary = getEnvelopeSummary(raw)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState(false)

  const handleCopy = async () => {
    if (!raw) return
    try {
      await navigator.clipboard.writeText(raw)
      setImportError(null)
      setImportSuccess(false)
    } catch {
      setImportError('复制失败')
    }
  }

  const handleImport = () => {
    setImportError(null)
    setImportSuccess(false)
    const text = importText.trim()
    if (!text) {
      setImportError('请粘贴存档 JSON')
      return
    }
    try {
      importSaveFromRaw(text)
      setImportSuccess(true)
      setImportText('')
      setTimeout(() => window.location.reload(), 500)
    } catch (e) {
      setImportError(e instanceof Error ? e.message : '导入失败')
    }
  }

  const handleClear = () => {
    clearSave()
  }

  const savedAtStr = summary.savedAt != null ? new Date(summary.savedAt).toLocaleString() : '—'

  return (
    <Panel title="诊断 / 自检">
      <Stack gap={10}>
        <div className="diagnostics-meta">
          <p><strong>应用版本</strong> {APP_VERSION}</p>
          <p><strong>schemaVersion</strong> {summary.schemaVersion ?? CURRENT_SCHEMA}（当前 {CURRENT_SCHEMA}）</p>
          <p><strong>savedAt</strong> {savedAtStr}</p>
          <p><strong>存档 key</strong> {SAVE_KEY}</p>
          {summary.stateSummary && (
            <p className="diagnostics-state-summary"><strong>state 摘要</strong> {summary.stateSummary}</p>
          )}
        </div>

        <div className="page-label">复制存档</div>
        <Button variant="secondary" size="sm" onClick={handleCopy} disabled={!raw}>
          复制存档 JSON 到剪贴板
        </Button>

        <div className="page-label">导入存档</div>
        <textarea
          className="diagnostics-import-textarea"
          placeholder="粘贴存档 JSON 后点击导入"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={4}
        />
        {importError && <p className="diagnostics-error">{importError}</p>}
        {importSuccess && <p className="diagnostics-success">导入成功，即将刷新…</p>}
        <Button variant="primary" size="sm" onClick={handleImport}>
          导入并刷新
        </Button>

        <div className="page-label">清档（重置一切）</div>
        <Button variant="danger" size="sm" onClick={handleClear} title="清空存档与传承，回到初始状态">
          清档并回到开局
        </Button>

        <div className="page-actions">
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'settings' as const })}>
            返回设置
          </Button>
        </div>
      </Stack>
    </Panel>
  )
}
