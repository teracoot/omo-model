import { readFileSync } from "node:fs";

export const cloneAssets = {
  "SECURITY-WARNING.txt": Buffer.from(`SECURITY WARNING\r\n\r\nThis archive intentionally contains raw secrets, credentials, private URLs, comments, and launchers.\r\nIt is NOT ENCRYPTED. Transfer only through a trusted channel, keep it briefly, and securely dispose of every copy after restore.\r\nInspect and extract require no secret display. Never upload this archive or paste its contents into chat.\r\n`, "utf8"),
  "HANDOFF-ZH-CN.txt": Buffer.from(`这是未加密的完整环境克隆，包含密钥、私有地址和启动器。只交给可信收件人，不要上传或粘贴到聊天。先 inspect，再用双重确认参数 extract，最后在 Windows 上显式确认后运行 restore-windows.ps1。恢复完成后重启 OpenCode；IDA MCP 路径可能需要按新机器调整或禁用。确认可用后安全销毁所有压缩包副本，保留回滚备份。\r\n`, "utf8"),
  "restore-windows.ps1": readFileSync(new URL("./omo-model-clone-restore.ps1", import.meta.url)),
  "validate-clone.mjs": readFileSync(new URL("./omo-model-clone-validator.mjs", import.meta.url)),
};
