// Jembatan antara AssemblyController (canvas) dan handler klik di Model: memetakan
// uuid mesh → nomor langkah, agar klik part memilih langkah tempat part dipasang.
interface AssemblyRuntime {
  stepOfUuid: Map<string, number>;
}

export const assemblyRuntime: AssemblyRuntime = {
  stepOfUuid: new Map(),
};

export function setStepMap(map: Map<string, number>): void {
  assemblyRuntime.stepOfUuid = map;
}
