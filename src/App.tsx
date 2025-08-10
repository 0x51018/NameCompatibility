import { useEffect, useState } from 'react'
import './App.css'

// 계산 과정 시각화를 위한 타입
type CalcDetail = {
  a: number[]
  b: number[]
  interleaved: number[]
  rows: number[][]
  score: number
}

function App() {
  const [name1, setName1] = useState('')
  const [name2, setName2] = useState('')
  const [stroke1, setStroke1] = useState<number[]>([])
  const [stroke2, setStroke2] = useState<number[]>([])
  const [compatibility, setCompatibility] = useState(0)
  const [detail, setDetail] = useState<CalcDetail | null>(null)

  // 유틸: 앞뒤 공백 제거
  const normalizeName = (s: string) => s.trim()
  // 유틸: 한글(완성형)만 허용, 공백/영문/기타 금지
  const HANGUL_SYLLABLES = /^[가-힣]+$/

  // 검증: 각 이름 최소 2글자, 두 이름의 글자 수 차이 <= 1, 한글만/중간 공백 금지
  const minLenOk1 = name1.length >= 2
  const minLenOk2 = name2.length >= 2
  const charsetOk1 = name1.length === 0 ? true : HANGUL_SYLLABLES.test(name1)
  const charsetOk2 = name2.length === 0 ? true : HANGUL_SYLLABLES.test(name2)
  const diffOk = minLenOk1 && minLenOk2 ? Math.abs(name1.length - name2.length) <= 1 : true
  const canCompute = minLenOk1 && minLenOk2 && charsetOk1 && charsetOk2 && diffOk

  // 이름/획수 변경 시 자동 계산
  useEffect(() => {
    if (canCompute) {
      const startWithB = name2.length > name1.length
      const d = buildCompatibilityDetail(stroke1, stroke2, startWithB)
      setCompatibility(d.score)
      setDetail(d)
    } else {
      setCompatibility(0)
      setDetail(null)
    }
  }, [name1, name2, stroke1, stroke2, canCompute])

  // 상단 이름 교차 원용 배열 (뒤 이름이 더 길면 뒤 이름부터 시작)
  const startWithBNames = name2.length > name1.length
  const interleavedNames = makeInterleaved(
    name1.split(''),
    name2.split(''),
    startWithBNames
  )

  // 피라미드 레이아웃 계산 상수 (CSS와 일치)
  const DOT = 36 // px
  const GAP = 10 // px
  const maxLen = detail ? detail.interleaved.length : interleavedNames.length
  const totalWidth = maxLen > 0 ? DOT * maxLen + GAP * (maxLen - 1) : 0

  // 줄 너비 계산 함수
  const rowWidth = (len: number) => (len > 0 ? DOT * len + GAP * (len - 1) : 0)

  return (
    <main className="container">
      <header className="header">
        <h1 className="title">이름 궁합 테스트</h1>
        <p className="subtitle">두 사람의 이름으로 궁합 점수를 계산하고 과정을 시각화해서 보여줍니다.</p>
      </header>

      <section className="card form-card">
        <div className="grid two">
          <div className="field">
            <label htmlFor="name1">남성 이름</label>
            <input
              id="name1"
              className="text-input"
              type="text"
              value={name1}
              onChange={(e) => {
                const raw = e.target.value
                const val = normalizeName(raw) // 앞뒤 공백 제거
                setName1(val)
                setStroke1(getStroke(val))
                if (val) debugLogDecomposition(val, '남성')
              }}
              aria-invalid={name1.length > 0 && (!minLenOk1 || !charsetOk1)}
            />
            {name1.length > 0 && !minLenOk1 && (
              <p className="hint error">두 글자 이상 입력하세요.</p>
            )}
            {name1.length > 0 && minLenOk1 && !charsetOk1 && (
              <p className="hint error">한글만 입력하세요. 중간 공백은 허용되지 않습니다.</p>
            )}
          </div>

          <div className="field">
            <label htmlFor="name2">여성 이름</label>
            <input
              id="name2"
              className="text-input"
              type="text"
              value={name2}
              onChange={(e) => {
                const raw = e.target.value
                const val = normalizeName(raw) // 앞뒤 공백 제거
                setName2(val)
                setStroke2(getStroke(val))
                if (val) debugLogDecomposition(val, '여성')
              }}
              aria-invalid={name2.length > 0 && (!minLenOk2 || !charsetOk2)}
            />
            {name2.length > 0 && !minLenOk2 && (
              <p className="hint error">두 글자 이상 입력하세요.</p>
            )}
            {name2.length > 0 && minLenOk2 && !charsetOk2 && (
              <p className="hint error">한글만 입력하세요. 중간 공백은 허용되지 않습니다.</p>
            )}
          </div>
        </div>

        {minLenOk1 && minLenOk2 && charsetOk1 && charsetOk2 && !diffOk && (
          <p className="hint error">두 이름의 글자 수 차이는 최대 1이어야 합니다.</p>
        )}
      </section>

      {detail && (
        <section className="card viz">
          {/* 피라미드 전체 폭을 고정하여 모든 줄의 간격을 동일하게 */}
          <div className="pyramid" style={{ width: totalWidth }}>
            {/* 최상단: 이름 교차 원 (숫자 대신 글자) */}
            <div className="row">
              <div className="row-cells" style={{ width: totalWidth }}>
                {interleavedNames.map((ch, i) => (
                  <span key={`name-${i}`} className="dot">{ch}</span>
                ))}
              </div>
            </div>

            {/* 이후 단계: 숫자 원, 좌우 들여쓰기로 피라미드 모양 */}
            <div className="steps-grid">
              {detail.rows.map((row, idx) => {
                const width = rowWidth(row.length)
                const indent = ((maxLen - row.length) / 2) * (DOT + GAP)
                return (
                  <div key={idx} className="row fade">
                    <div className="row-cells" style={{ width, marginLeft: `${indent}px` }}>
                      {row.map((num, j) => (
                        <span key={j} className="dot">{num}</span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 결과: 과정 아래에 큰 숫자만 표시 */}
          <div className="result-inline">
            <div className="big-number" aria-label={`궁합 점수 ${compatibility}%`}>
              {compatibility}%
            </div>
          </div>
        </section>
      )}
    </main>
  )
}

// 유틸: 교차 배열 생성 (startWithB가 true면 b 먼저)
function makeInterleaved<T>(a: T[], b: T[], startWithB: boolean): T[] {
  const result: T[] = []
  const maxLen = Math.max(a.length, b.length)
  const first = startWithB ? b : a
  const second = startWithB ? a : b
  for (let i = 0; i < maxLen; i += 1) {
    if (first[i] !== undefined) result.push(first[i] as T)
    if (second[i] !== undefined) result.push(second[i] as T)
  }
  return result
}

// 디버깅: 이름 분해 매핑을 콘솔에 출력
function debugLogDecomposition(name: string, who: string) {
  if (!name) return
  try {
    const triples = convNameToNum(name)
    const rows = triples.map((inds, idx) => {
      const [choIdx, jungIdx, jongIdx] = inds
      const choStroke = checkStroke(choIdx, 0)
      const jungStroke = checkStroke(jungIdx, 1)
      const jongStroke = checkStroke(jongIdx, 2)
      const total = [choStroke, jungStroke, jongStroke].reduce((a, b) => (a || 0) + (b || 0), 0)
      return {
        i: idx,
        char: name[idx],
        choIdx,
        jungIdx,
        jongIdx,
        choStroke,
        jungStroke,
        jongStroke,
        totalStroke: total,
      }
    })
    // eslint-disable-next-line no-console
    console.group(`[${who}] 이름 분해: ${name}`)
    // eslint-disable-next-line no-console
    console.table(rows)
    // eslint-disable-next-line no-console
    console.groupEnd()
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('분해 로깅 중 오류', e)
  }
}

// 상세 계산 로직: 시퀀스 단계와 점수 동시 산출
function buildCompatibilityDetail(stroke1: number[], stroke2: number[], startWithB: boolean): CalcDetail {
  const norm = (arr: number[]) => arr.filter(v => typeof v === 'number' && v >= 0).map(v => v % 10)
  const a = norm(stroke1)
  const b = norm(stroke2)

  const interleaved = makeInterleaved(a, b, startWithB)

  let rows: number[][] = []
  if (interleaved.length >= 2) {
    rows = [interleaved]
    let seq = interleaved
    while (seq.length > 2) {
      const next: number[] = []
      for (let i = 0; i < seq.length - 1; i += 1) {
        next.push((seq[i] + seq[i + 1]) % 10)
      }
      rows.push(next)
      seq = next
    }
  }

  const last = rows.length ? rows[rows.length - 1] : [0, 0]
  const score = Math.min((last[0] ?? 0) * 10 + (last[1] ?? 0), 100)

  return { a, b, interleaved, rows, score }
}

function convNameToNum(name: string){
  if (name.length === 0) return [];
  return name.split('').map(convKorToNum);
}

function convKorToNum(name: string){ // ex) 김 -> [1, ]
  if(name.length !== 1) return [-1, -1, -1];
  const num = name.charCodeAt(0) - 0xAC00;
  return [Math.floor(num / 588), Math.floor((num % 588) / 28), num % 28];
}

function checkStroke(num: number, position: number){
  const stroke_chosung = [1, 2, 1, 2, 4, 3, 3, 4, 8, 2, 4, 1, 2, 4, 3, 2, 3, 4, 3]
  const stroke_jungseong = [2, 3, 3, 4, 2, 3, 3, 4, 2, 4, 5, 3, 3, 2, 4, 5, 3, 3, 1, 2, 1]
  const stroke_jongseong = [0, 1, 2, 3, 1, 3, 4, 2, 3, 4, 7, 5, 6, 7, 6, 3, 4, 6, 2, 4, 1, 2, 3, 2, 3, 4, 3]
  const stroke = [stroke_chosung, stroke_jungseong, stroke_jongseong]
  return stroke[position][num];
}

function getStroke(name: string){
  if (name.length === 0) return [];
  return convNameToNum(name).map((ind) => 
    ind.reduce((sum, val, pos) => sum + checkStroke(val, pos), 0)
  );
}

export default App
