using UnityEngine;
using System.Collections;

public class MultiplierControlScript : MonoBehaviour {

	public int multiplier = 1;
	public float collectionRadius = 1f;
	public float lifeTime = 5f;

	// Use this for initialization
	void Start () {
		//start to travel in a random direction
		Invoke("Destroy", lifeTime);
	}
	
	// Update is called once per frame
	void Update () {
	
	}

	void OnTriggerEnter2D(Collider2D coll){
		if (coll.gameObject.name == "plane") {
			Globals.scoreMultiplier += 1;
			Destroy (gameObject);
		}
	}

	void Destroy(){
		Destroy (gameObject);
	}
}
