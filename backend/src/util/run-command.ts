import { execFile, spawn } from "child_process"

export function runCmd(command: string, args: string[] = []) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    execFile(command, args, (error, stdout, stderr) => {
      if (error) {
        reject(error)
      } else {
        resolve({ stdout, stderr })
      }
    })
  })
}

export function runCmdForBuffer(command: string, args: string[] = []) {
  return new Promise<Buffer>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] })
    const stdout: Buffer[] = []
    let stderr = ""

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk))
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()))
    child.once("error", reject)
    child.once("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdout))
      } else {
        reject(new Error(`${command} exited with code ${code}: ${stderr}`))
      }
    })
  })
}
