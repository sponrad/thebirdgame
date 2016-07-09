using UnityEngine;
using System.Collections;

public class PlaneExhaustControl : MonoBehaviour {

	public float lifeTime = 1.5f;

	// Use this for initialization
	void Start () {
		Invoke("Destroy", lifeTime);
	}
	
	// Update is called once per frame
	void Update () {
	
	}

	void Destroy(){
		Destroy (gameObject);
	}
}
