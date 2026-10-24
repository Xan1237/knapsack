import { Matrix4, Quaternion, Vector3 } from "three";
import { permutations } from "./domain";
/** Solver [X,Y length,Z up] -> Three [X,Y up,Z length], with proper signed rotations. */
export function itemQuaternion(orientation: number) {
  const p = permutations[orientation];
  const basis = [new Vector3(), new Vector3(), new Vector3()];
  for (let occupied = 0; occupied < 3; occupied++)
    basis[p[occupied]].setComponent(occupied, 1);
  const solver = new Matrix4().makeBasis(basis[0], basis[1], basis[2]);
  if (solver.determinant() < 0) basis[0].multiplyScalar(-1);
  solver.makeBasis(basis[0], basis[1], basis[2]);
  const swap = new Matrix4().set(
    1,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    0,
    1,
  );
  return new Quaternion().setFromRotationMatrix(
    swap.clone().multiply(solver).multiply(swap),
  );
}
