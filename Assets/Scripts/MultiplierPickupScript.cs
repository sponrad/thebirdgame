using UnityEngine;
using System.Collections;

public class MultiplierPickupScript : MonoBehaviour {

	public Transform target = null;
	public float speed = 5f;

	// Use this for initialization
	void Start () {
	
	}
	
	// Update is called once per frame
	void Update () {
		if (target) {
			float step = speed * Time.deltaTime;
			transform.parent.position = Vector3.MoveTowards (transform.parent.position, target.position, step);
		}
	}

	void OnTriggerEnter2D(Collider2D coll){
		if (coll.gameObject.name == "plane") {
			target = coll.gameObject.transform;
		}
	}
}
