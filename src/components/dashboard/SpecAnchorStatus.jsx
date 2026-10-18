"use client";

import { useEffect, useState } from "react";
import { snapshotAnchor, snapshotManifestUrl, verifySnapshotAnchor } from "@/lib/integrationApi";
import { anchorBadge, explorerUrl, isAnchorSettled, shortHex, verificationRows } from "@/lib/specAnchor.mjs";
import { ActionButton, Badge, Icon } from "@/components/ui";

const rowIcons = { success: "check", danger: "warning", warning: "warning" };

/**
 * 발행 기준(스냅샷)의 블록체인 기록 상태와 검증 버튼. SpecChangeBar의 anchorSlot에 들어간다.
 * 체인 기록이 꺼져 있으면 배지는 숨기고 검증 버튼만 둔다(1·2단계는 체인 없이도 확인된다).
 * 기록 행이 없거나(NONE) 조회에 실패하면 아무것도 그리지 않는다.
 * 검증 결과 목록은 바의 flex 줄바꿈을 이용해 바 아래 한 줄을 통째로 쓴다.
 */
export function SpecAnchorStatus({ projectId, snapshotId }) {
  const [anchor, setAnchor] = useState(null);
  const [result, setResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  useEffect(() => {
    let active = true;
    snapshotAnchor(projectId, snapshotId).then((data) => { if (active) setAnchor(data); }).catch(() => { if (active) setAnchor(null); });
    return () => { active = false; };
  }, [projectId, snapshotId]);
  // 체인이 꺼져 있으면 상태가 바뀌지 않으므로 기다리지 않는다. 폴링 중 오류는 다음 차례에 다시 묻는다.
  const polling = Boolean(anchor?.chainEnabled) && !isAnchorSettled(anchor?.state);
  useEffect(() => {
    if (!polling) return undefined;
    let active = true, pending = false;
    const timer = window.setInterval(async () => {
      if (pending) return; pending = true;
      try { const data = await snapshotAnchor(projectId, snapshotId); if (active) setAnchor(data); }
      catch { /* 마지막으로 받은 상태를 그대로 둔다. */ }
      finally { pending = false; }
    }, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [polling, projectId, snapshotId]);
  async function verify() {
    setVerifying(true); setVerifyError("");
    try { setResult(await verifySnapshotAnchor(projectId, snapshotId)); }
    catch (failure) { setResult(null); setVerifyError(failure.message); }
    finally { setVerifying(false); }
  }
  if (!anchor || anchor.state === "NONE") return null;
  const badge = anchorBadge(anchor);
  const txUrl = badge ? explorerUrl(anchor.chainId, "tx", anchor.txHash) : null;
  const contractUrl = anchor.state === "CONFIRMED" ? explorerUrl(anchor.chainId, "address", anchor.contractAddress) : null;
  const rows = result ? verificationRows(result) : [];
  return (
    <>
      <div className="anchor">
        {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
        {txUrl && (
          <ActionButton size="sm" variant="ghost" href={txUrl} target="_blank" rel="noopener noreferrer" title={anchor.txHash}>
            <Icon name="link" size={12} /> Etherscan
          </ActionButton>
        )}
        <ActionButton size="sm" disabled={verifying} onClick={verify}>
          <Icon name="refresh" size={12} /> {verifying ? "검증 중…" : "검증"}
        </ActionButton>
      </div>
      {(result || verifyError) && (
        <div className="anchor-results" role="status">
          {verifyError ? <p className="anchor-error">{verifyError}</p> : <>
            <p className="anchor-summary">
              {result.verified ? "발행 이후 바뀐 곳이 없습니다." : rows.some((row) => row.tone === "danger") ? "어긋난 단계가 있습니다." : "확인하지 못한 단계가 있습니다."}
              {anchor.digest && <> 지문 <code title={anchor.digest}>{shortHex(anchor.digest)}</code></>}
            </p>
            <ul>
              {rows.map((row) => (
                <li key={row.step}>
                  <Badge tone={row.tone}>{rowIcons[row.tone] && <Icon name={rowIcons[row.tone]} size={11} />} {row.status}</Badge>
                  <span>{row.label}</span>
                </li>
              ))}
            </ul>
            <p className="anchor-summary">
              <a href={snapshotManifestUrl(projectId, snapshotId)}>매니페스트 내려받기</a>
              {contractUrl && <> · SHA-256을 계산해 <a href={contractUrl} target="_blank" rel="noopener noreferrer">컨트랙트</a>의 digestOf 값과 비교하면 이 서버 없이도 확인할 수 있습니다.</>}
            </p>
          </>}
        </div>
      )}
      <style jsx>{`
        .anchor { display:flex; align-items:center; flex-wrap:wrap; gap:8px; }
        .anchor-results { order:1; flex-basis:100%; display:flex; flex-direction:column; gap:4px; padding:6px 0 2px; border-top:1px solid var(--border); }
        .anchor-results ul { display:flex; flex-direction:column; gap:4px; margin:0; padding:0; list-style:none; }
        .anchor-results li { display:flex; align-items:center; gap:8px; color:var(--text-1); }
        .anchor-summary, .anchor-error { margin:0; line-height:1.5; }
        .anchor-error { color:var(--text-1); }
        .anchor-summary code { font-size:11px; color:var(--text-1); }
        .anchor-summary a { color:var(--text-1); text-decoration:underline; }
      `}</style>
    </>
  );
}
