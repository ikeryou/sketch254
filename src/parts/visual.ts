import {Composite } from "matter-js";
import { Func } from '../core/func';
import { Canvas } from '../webgl/canvas';
import { Object3D } from 'three/src/core/Object3D';
import { Conf } from '../core/conf';
import { MeshToonMaterial } from "three/src/materials/MeshToonMaterial";
import { Mesh } from 'three/src/objects/Mesh';
import { Color } from 'three/src/math/Color';
import { PointLight } from 'three/src/lights/PointLight';
import { Param } from "../core/param";
import { TubeGeometry } from 'three/src/geometries/TubeGeometry';
import { Vector3 } from 'three/src/math/Vector3';
import { BufferAttribute } from 'three/src/core/BufferAttribute';
import { CatmullRomCurve3 } from 'three/src/extras/curves/CatmullRomCurve3';
import { Util } from "../libs/util";

export class Visual extends Canvas {

  private _con: Object3D;
  private _line:Array<Mesh> = [];
  private _pLight:PointLight;

  constructor(opt: any) {
    super(opt);

    // ライト
    this._pLight = new PointLight(0xffffff, 1, 0);
    this.mainScene.add(this._pLight);
    this._pLight.position.set( 100, 200, -100 );

    this._con = new Object3D()
    this.mainScene.add(this._con)

    const mat:Array<MeshToonMaterial> = []
    Conf.instance.COLOR_LIST.forEach((val) => {
      mat.push(
        new MeshToonMaterial({
          color:val,
          gradientMap: null,
          depthTest:false,
        }),
      )
    })

    const num = Conf.instance.COLUMNS + Conf.instance.ROWS;
    for(let i = 0; i < num; i++) {
      const line = new Mesh(
        this._makeLineGeo([new Vector3(0,0,0), new Vector3(1,0,0), new Vector3(2,0,0)]),
        mat[i % mat.length]
      )
      this._con.add(line);
      this._line.push(line);
    }

    this._resize()
  }


  public updatePos(stack:Composite): void {

    this._line.forEach((val,i) => {
      const p = i < Conf.instance.ROWS ? this._getRowsPosArr(stack, i) : this._getColumnsPosArr(stack, i - Conf.instance.ROWS);
      val.geometry.dispose();
      val.geometry = this._makeLineGeo(p);
    })
  }


  private _getRowsPosArr(stack:Composite, rowsKey:number): Array<Vector3> {
    const offsetX = -this.renderSize.width * 0.5
    const offsetY = this.renderSize.height * 0.5

    let basePos:Array<Vector3> = [];
    let start = rowsKey * Conf.instance.COLUMNS;
    for(let i = start; i < start + Conf.instance.COLUMNS; i++) {
      const pos = stack.bodies[i].position;
      basePos.push(new Vector3(pos.x + offsetX, pos.y * -1 + offsetY, 0));
    }

    return basePos;
  }


  private _getColumnsPosArr(stack:Composite, columnKey:number): Array<Vector3> {
    const offsetX = -this.renderSize.width * 0.5
    const offsetY = this.renderSize.height * 0.5

    let basePos:Array<Vector3> = [];
    let start = 0;
    for(let i = start; i < Conf.instance.ROWS; i++) {
      const key = (i * Conf.instance.COLUMNS) + columnKey
      const pos = stack.bodies[key].position;
      basePos.push(new Vector3(pos.x + offsetX, pos.y * -1 + offsetY, 0));
    }

    return basePos;
  }


  protected _update(): void {
    super._update()

    if (this.isNowRenderFrame()) {
      this._render()
    }
  }


  private _render(): void {
    const bgColor = new Color(Param.instance.main.bg.value)
    this.renderer.setClearColor(bgColor, 1)
    this.renderer.render(this.mainScene, this.camera)
  }


  public isNowRenderFrame(): boolean {
    return this.isRender
  }


  _resize(isRender: boolean = true): void {
    super._resize();

    const w = Func.instance.sw();
    const h = Func.instance.sh();

    this.renderSize.width = w;
    this.renderSize.height = h;

    this.updateCamera(this.camera, w, h);

    let pixelRatio: number = window.devicePixelRatio || 1;

    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(w, h);
    this.renderer.clear();

    if (isRender) {
      this._render();
    }
  }


  // ---------------------------------
  //
  // ---------------------------------
  private _makeLineGeo(basePos:Array<Vector3>):TubeGeometry {
    const arr:Array<Vector3> = []

    basePos.forEach((val) => {
      arr.push(val)
    });

    const sampleClosedSpline = new CatmullRomCurve3(arr, false);

    const tube = new TubeGeometry(sampleClosedSpline, 64, 5, 3, false);

    const num = tube.attributes.position.count
    const order = new Float32Array(num * 3)
    let i = 0
    while(i < num) {
      order[i*3+0] = Util.instance.map(i, 0, 1, 0, num - 1)
      order[i*3+1] = 0
      order[i*3+2] = 0
      i++
    }
    tube.setAttribute('order', new BufferAttribute(order, 3));

    return tube
  }
}
