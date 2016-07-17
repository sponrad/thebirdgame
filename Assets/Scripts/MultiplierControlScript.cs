using UnityEngine;
using System.Collections;

public class MultiplierControlScript : MonoBehaviour {

	public int multiplier = 1;
	public float collectionRadius = 1f;
	public float lifeTime = 5f;
	public Transform target = null;
	public float speed = 2f;

	private GameObject control;

	// Use this for initialization
	void Start () {
		//start to travel in a random direction
		Invoke("Destroy", lifeTime);
		control = GameObject.Find ("SkySceneControl");
	}
	
	// Update is called once per frame
	void Update () {
		if (target) {
			float step = speed * Time.deltaTime;
			transform.position = Vector3.MoveTowards (transform.position, target.position, step);
		}
	}

	void OnTriggerEnter2D(Collider2D coll){
		if (coll.gameObject.name == "plane") {
			control.GetComponent<SkySceneControl>().SoundMultiplierPickup ();
			Globals.scoreMultiplier += 1;
			Destroy (gameObject);
		}
	}

	void Destroy(){
		Destroy (gameObject);
	}
}
